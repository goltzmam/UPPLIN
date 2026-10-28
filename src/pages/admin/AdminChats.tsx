import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatProfileDialog } from "@/components/chat/ChatProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { loadConversations, unavailableIdentity, type ChatIdentity } from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { APP_ORIGIN } from "@/lib/web-surfaces";
import { cn } from "@/lib/utils";

export default function AdminChats() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<ChatIdentity | null>(null);
  const { data: conversations = [], isPending, isError, refetch } = useQuery({
    queryKey: ["support-conversations", user?.id], queryFn: () => loadConversations(user!.id, { all: true }), enabled: !!user, refetchInterval: 5000,
  });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["support-conversations"] }); };
    const channel = supabase.channel("support-chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
  const selected = conversations.find(c => c.id === selectedId);
  const filtered = conversations.filter(c => (filter === "all" || c.type === filter) && [c.event?.title, c.subject, c.last_message?.content, ...Object.values(c.participants).map(p => p.full_name)].some(value => (value || "").toLowerCase().includes(search.toLowerCase())));
  const pair = selected ? [selected.participants[selected.participant_1_id] || unavailableIdentity(selected.participant_1_id), selected.participants[selected.participant_2_id] || unavailableIdentity(selected.participant_2_id)] : [];
  const other = selected ? pair.find(p => p.id !== user?.id) || pair[0] : null;
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Central de Mensagens</h1><p className="text-sm text-muted-foreground">Atendimento e acompanhamento das conversas em tempo real</p></div>
    <div className="grid grid-cols-3 gap-3">
      {[['Conversas', conversations.length], ['Eventos', conversations.filter(c => c.type === 'user_organizer').length], ['Suporte', conversations.filter(c => c.type !== 'user_organizer').length]].map(([label, count]) => <div key={label} className="border bg-card rounded-xl p-4"><p className="text-2xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
    </div>
    {isError && <div role="alert" className="border rounded-xl p-4"><p>Não foi possível carregar as conversas.</p><Button variant="ghost" onClick={() => void refetch()}>Tentar novamente</Button></div>}
    <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-4 h-auto xl:h-[calc(100dvh-275px)] min-h-[500px]">
      <section className="border rounded-xl bg-card flex flex-col min-h-0 overflow-hidden">
        <div className="p-3 border-b space-y-3"><label className="flex items-center gap-2"><Search className="h-4 w-4" /><Input aria-label="Buscar conversas" placeholder="Nome, evento ou mensagem" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <select aria-label="Tipo de conversa" className="w-full bg-background border rounded-md p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas as conversas</option><option value="user_organizer">Participante e organizador</option><option value="user_admin">Suporte ao participante</option><option value="organizer_admin">Suporte ao organizador</option></select>
        </div>
        <div className="overflow-y-auto flex-1 max-h-[420px] xl:max-h-none divide-y">
          {isPending && <p className="p-6 text-center text-sm">Carregando conversas...</p>}
          {!isPending && !isError && filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>}
          {filtered.map(c => {
            const people = [c.participants[c.participant_1_id] || unavailableIdentity(c.participant_1_id), c.participants[c.participant_2_id] || unavailableIdentity(c.participant_2_id)];
            return <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn("w-full text-left p-4 hover:bg-muted/50", selectedId === c.id && "bg-muted")}>
              <div className="flex items-center gap-3"><div className="flex -space-x-2">{people.map(p => <Avatar key={p.id} className="h-9 w-9 ring-2 ring-background"><AvatarImage src={p.photo_url || undefined} alt={p.full_name} /><AvatarFallback className="text-xs">{p.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}</div>
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{c.type === "user_organizer" ? "Evento" : "Suporte"} · {c.message_count} mensagens</p><p className="font-medium text-sm truncate">{people.map(p => p.full_name).join(" ↔ ")}</p></div></div>
              {c.event?.title && <p className="mt-2 text-xs truncate">{c.event.title}</p>}
              {c.last_message && <p className="mt-1 text-xs text-muted-foreground truncate">{c.last_message.content}</p>}
            </button>;
          })}
        </div>
      </section>
      <section className="border rounded-xl bg-card overflow-hidden flex flex-col min-w-0 min-h-[500px] xl:min-h-0">
        {selected && other ? <>
          <div className="px-3 py-2 border-b space-y-2"><div className="flex gap-3 flex-wrap">{pair.map(p => <button key={p.id} type="button" onClick={() => setProfile(p)} className="text-xs text-primary underline">Ver perfil: {p.full_name}</button>)}</div>
            {selected.event_id && <a href={`${APP_ORIGIN}/evento/${selected.event_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground">Evento: {selected.event?.title || "Ver evento"}</a>}
            <p className="text-xs text-muted-foreground flex gap-1 items-center"><Shield className="h-3 w-3" />Suas respostas aparecem como Suporte UPPLIN.</p>
          </div>
          <ChatWindow key={selected.id} conversationId={selected.id} identities={selected.participants}
            otherParticipant={{ ...other, name: other.full_name }} observer={![selected.participant_1_id, selected.participant_2_id].includes(user?.id || "")}
            onClose={() => setSelectedId(null)} className="flex-1" />
        </> : <div className="m-auto text-center text-muted-foreground p-8"><MessageCircle className="mx-auto h-12 w-12 mb-3" /><p>Selecione uma conversa para acompanhar ou responder.</p></div>}
      </section>
    </div>
    <ChatProfileDialog identity={profile} onClose={() => setProfile(null)} />
  </div>;
}
