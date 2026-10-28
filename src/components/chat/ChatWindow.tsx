import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatProfileDialog } from "./ChatProfileDialog";
import { loadChatIdentities, unavailableIdentity, type ChatIdentity } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; read_at: string | null }
interface PendingMessage extends Message { failed?: boolean; sent?: boolean }
interface ChatWindowProps {
  conversationId: string;
  otherParticipant: { id: string; name: string; photo_url?: string | null; subtitle?: string | null; is_organizer?: boolean; is_support?: boolean; profile_path?: string | null; cover_photo_url?: string | null };
  identities?: Record<string, ChatIdentity>;
  observer?: boolean;
  onClose?: () => void;
  className?: string;
}
const timeLabel = (date: string) => Number.isFinite(Date.parse(date)) ? format(new Date(date), "dd/MM HH:mm") : "";

export function ChatWindow({ conversationId, otherParticipant, identities = {}, observer = false, onClose, className }: ChatWindowProps) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<ChatIdentity | null>(null);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const publishRef = useRef<((typing: boolean) => void) | null>(null);
  const lastTyping = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const key = ["chat-messages", conversationId, user?.id];
  const { data: identityMap = identities } = useQuery({
    queryKey: ["chat-identities", conversationId, user?.id],
    queryFn: async () => (await loadChatIdentities([conversationId]))[conversationId] || {},
    initialData: identities, enabled: !!user, refetchInterval: 10000,
  });
  const fallback: ChatIdentity = { ...otherParticipant, id: otherParticipant.id, full_name: otherParticipant.name || "Conta indisponível", photo_url: otherParticipant.photo_url || null };
  const other = identityMap[otherParticipant.id] || fallback;
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from("messages").select("*").eq("conversation_id", conversationId)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
      if (pageParam) query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Message[];
    },
    getNextPageParam: page => page.length === 50 ? { created_at: page[49].created_at, id: page[49].id } : undefined,
    enabled: !!user, refetchInterval: 5000,
  });
  const saved = useMemo(() => [...(data?.pages.flat() || [])].reverse(), [data]);
  const messages = useMemo(() => {
    const persisted = new Set(saved.map(m => m.id));
    return [...saved, ...pending.filter(m => !persisted.has(m.id))];
  }, [saved, pending]);

  useEffect(() => {
    const ids = new Set(saved.map(message => message.id));
    setPending(old => old.some(message => ids.has(message.id)) ? old.filter(message => !ids.has(message.id)) : old);
  }, [saved]);
  useEffect(() => {
    setDraft(""); setPending([]); nearBottom.current = true; setOnline(false); setTyping(false);
  }, [conversationId]);
  useEffect(() => {
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      void client.invalidateQueries({ queryKey: ["conversations"] });
      void client.invalidateQueries({ queryKey: ["support-conversations"] });
      void client.invalidateQueries({ queryKey: ["chat-identities", conversationId] });
    };
    const channel = supabase.channel(`chat-window:${conversationId}:${user?.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, refresh).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, user?.id, client]);
  useEffect(() => {
    if (nearBottom.current) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, typing]);
  useEffect(() => {
    if (observer || !user || !saved.some(m => m.sender_id !== user.id && !m.read_at)) return;
    void supabase.rpc("mark_chat_read", { p_conversation_id: conversationId }).then(({ error }) => {
      if (!error) void client.invalidateQueries({ queryKey: ["conversations", user.id] });
    });
  }, [saved, conversationId, user, observer, client]);

  useEffect(() => {
    if (!user || observer) return;
    let active = true;
    let presence: { online_until: string; typing_until: string | null } | null = null;
    const refresh = () => { if (active) { setOnline(!!presence && Date.parse(presence.online_until) > Date.now()); setTyping(!!presence?.typing_until && Date.parse(presence.typing_until) > Date.now()); } };
    const publish = (value: boolean) => { void supabase.rpc("set_chat_presence", { p_conversation_id: conversationId, p_typing: value }).then(() => undefined); };
    publishRef.current = publish; publish(false);
    void supabase.from("chat_presence").select("online_until,typing_until").eq("conversation_id", conversationId).eq("user_id", otherParticipant.id).maybeSingle().then(({ data }) => { if (active) { presence = data; refresh(); } });
    const channel = supabase.channel(`chat-presence:${conversationId}:${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "chat_presence", filter: `conversation_id=eq.${conversationId}` }, payload => {
      const row = payload.new as { user_id?: string; online_until: string; typing_until: string | null };
      if (row.user_id === otherParticipant.id) { presence = row; refresh(); }
    }).subscribe();
    const heartbeat = setInterval(() => publish(false), 10000); const expiry = setInterval(refresh, 1000);
    return () => { active = false; clearInterval(heartbeat); clearInterval(expiry); publishRef.current = null; void supabase.removeChannel(channel); void supabase.rpc("set_chat_presence", { p_conversation_id: conversationId, p_online: false }).then(() => undefined); };
  }, [conversationId, user, otherParticipant.id, observer]);

  const send = async (content: string, id: string = crypto.randomUUID()) => {
    content = content.trim();
    if (!content || content.length > 4000 || !user || sending) return;
    const row: PendingMessage = { id, conversation_id: conversationId, sender_id: user.id, content, created_at: new Date().toISOString(), read_at: null };
    setPending(old => [...old.filter(m => m.id !== id), row]); setDraft(""); setSending(true); nearBottom.current = true; publishRef.current?.(false);
    try {
      const { error } = await supabase.from("messages").insert({ id, conversation_id: conversationId, sender_id: user.id, content });
      if (error && error.code !== "23505") throw error;
      setPending(old => old.map(m => m.id === id ? { ...m, sent: true } : m));
      void refetch();
      void client.invalidateQueries({ queryKey: ["conversations"] });
      void client.invalidateQueries({ queryKey: ["support-conversations"] });
    } catch { setPending(old => old.map(m => m.id === id ? { ...m, failed: true } : m)); }
    finally { setSending(false); }
  };
  const showIdentity = (identity: ChatIdentity, small = false) => <button type="button" onClick={() => setProfile(identity)} aria-label={`Ver perfil de ${identity.full_name}`} className="shrink-0 rounded-full">
    <Avatar className={small ? "h-7 w-7" : "h-10 w-10"}><AvatarImage src={identity.photo_url || undefined} alt={identity.full_name} /><AvatarFallback className="text-xs">{identity.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
  </button>;

  return <div className={cn("flex flex-col h-full min-h-0 bg-background overflow-hidden", className)}>
    <header className="flex gap-3 items-center p-3 border-b shrink-0">
      {onClose && <Button variant="ghost" size="icon" aria-label="Fechar conversa" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>}
      {showIdentity(other)}
      <button type="button" onClick={() => setProfile(other)} className="text-left min-w-0 flex-1"><p className="font-semibold truncate">{other.full_name}</p><p className="text-xs text-muted-foreground">{observer ? "Conversa acompanhada pelo suporte" : typing ? "digitando…" : online ? "online agora" : other.subtitle}</p></button>
      {observer && Object.values(identityMap).filter(p => p.id !== other.id && !p.is_support).map(p => <span key={p.id}>{showIdentity(p)}</span>)}
    </header>
    <div ref={viewport} onScroll={() => { const el = viewport.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3" aria-live="polite" aria-label="Mensagens da conversa">
      {hasNextPage && <Button variant="ghost" className="w-full" disabled={isFetchingNextPage} onClick={() => { nearBottom.current = false; void fetchNextPage(); }}>Carregar mensagens anteriores</Button>}
      {isPending && <p className="text-sm text-muted-foreground text-center">Carregando mensagens...</p>}
      {isError && <div role="alert" className="text-center text-sm"><p>Não foi possível carregar as mensagens.</p><Button variant="ghost" onClick={() => void refetch()}>Tentar novamente</Button></div>}
      {!isPending && !isError && messages.length === 0 && <p className="py-10 text-center text-muted-foreground">Envie uma mensagem para iniciar a conversa.</p>}
      {messages.map(message => {
        const mine = message.sender_id === user?.id;
        const sender = identityMap[message.sender_id] || unavailableIdentity(message.sender_id);
        const local = pending.find(p => p.id === message.id);
        return <div key={message.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
          {showIdentity(sender, true)}
          <div className={cn("max-w-[78%] rounded-2xl px-3 py-2 break-words", mine ? "bg-primary text-primary-foreground" : "bg-muted", local?.failed && "ring-1 ring-destructive")}>
            <button type="button" onClick={() => setProfile(sender)} className="text-xs font-semibold opacity-80">{sender.full_name}</button>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p className="text-[10px] mt-1 opacity-70">{timeLabel(message.created_at)}{mine && (local ? local.failed ? " · Falha no envio" : local.sent ? " · Enviada" : " · Enviando…" : message.read_at ? " · Lida" : " · Enviada")}</p>
            {local?.failed && <button type="button" className="text-xs underline" disabled={sending} onClick={() => void send(message.content, message.id)}>Reenviar</button>}
          </div>
        </div>;
      })}
      {typing && <p className="text-xs text-muted-foreground">{other.full_name} está digitando…</p>}
      <div ref={bottom} />
    </div>
    <form className="p-3 border-t flex gap-2 items-end shrink-0" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} onSubmit={e => { e.preventDefault(); void send(draft); }}>
      <label htmlFor={`chat-draft-${conversationId}`} className="sr-only">Mensagem</label>
      <textarea id={`chat-draft-${conversationId}`} rows={2} maxLength={4000} value={draft} disabled={sending} placeholder="Escreva uma mensagem…" className="flex-1 min-w-0 max-h-32 resize-y bg-muted rounded-xl p-3 text-sm outline-none focus:ring-2 ring-primary"
        onChange={e => { setDraft(e.target.value); if (Date.now() - lastTyping.current > 1500) { publishRef.current?.(!!e.target.value); lastTyping.current = Date.now(); } }}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(draft); } }} />
      <Button type="submit" size="icon" aria-label="Enviar mensagem" disabled={!draft.trim() || sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
    </form>
    <ChatProfileDialog identity={profile} onClose={() => setProfile(null)} />
  </div>;
}
