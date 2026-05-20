import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, User, Building2, Shield, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  event_id: string | null;
  participant_1_id: string;
  participant_2_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  other_participant?: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    subtitle?: string | null;
    is_organizer?: boolean;
    is_support?: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
  event?: {
    title: string;
  };
}

interface ConversationsListProps {
  onSelectConversation: (conv: Conversation) => void;
  selectedId?: string;
  filter?: "all" | "user_organizer" | "organizer_admin" | "user_admin";
  search?: string;
  groupByEvent?: boolean;
}

export function ConversationsList({
  onSelectConversation,
  selectedId,
  filter = "all",
  search = "",
  groupByEvent = false,
}: ConversationsListProps) {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("conversations")
        .select(`*, events(title)`)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data: convs, error } = await query;
      if (error) throw error;

      const enrichedConvs = await Promise.all(
        (convs || []).map(async (conv) => {
          const otherParticipantId =
            conv.participant_1_id === user.id ? conv.participant_2_id : conv.participant_1_id;

          const { data: participantData } = await supabase
            .from("profiles_public")
            .select("id, full_name, photo_url")
            .eq("id", otherParticipantId)
            .maybeSingle();

          let enrichedParticipant: Conversation["other_participant"] = participantData
            ? { ...participantData, subtitle: "Online" }
            : { id: otherParticipantId, full_name: null, photo_url: null, subtitle: "Online" };

          // For event chats: if the OTHER participant is an organizer owner,
          // show the organizer brand (display_name + logo) instead of the personal profile.
          if (conv.type === "user_organizer") {
            const { data: org } = await supabase
              .from("organizer_accounts")
              .select("display_name, logo_url, owner_user_id")
              .eq("owner_user_id", otherParticipantId)
              .maybeSingle();
            let coverFallback: string | null = null;
            if (conv.event_id) {
              const { data: ev } = await supabase
                .from("events")
                .select("cover_image_url")
                .eq("id", conv.event_id)
                .maybeSingle();
              coverFallback = ev?.cover_image_url || null;
            }
            if (org) {
              enrichedParticipant = {
                id: otherParticipantId,
                full_name: org.display_name,
                photo_url: org.logo_url || coverFallback,
                subtitle: org.display_name ? `Organizador • ${conv.events?.title || "Evento"}` : "Organizador do evento",
                is_organizer: true,
              };
            } else {
              // Participant viewing organizer (or vice versa) — at minimum show the event title
              enrichedParticipant = {
                ...enrichedParticipant,
                photo_url: enrichedParticipant.photo_url || coverFallback,
                subtitle: "Organizador do evento",
                is_organizer: true,
              };
            }
          }

          // Platform support
          if (conv.type === "user_admin" || conv.type === "organizer_admin") {
            enrichedParticipant = {
              id: otherParticipantId,
              full_name: "Suporte UPPLIN",
              photo_url: enrichedParticipant.photo_url,
              subtitle: "Equipe oficial",
              is_support: true,
            };
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .is("read_at", null);

          return {
            ...conv,
            other_participant: enrichedParticipant,
            last_message: lastMsg,
            unread_count: count || 0,
          };
        })
      );

      return enrichedConvs as Conversation[];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.other_participant?.full_name || "").toLowerCase();
      const ev = (c.event?.title || "").toLowerCase();
      const subj = (c.subject || "").toLowerCase();
      const msg = (c.last_message?.content || "").toLowerCase();
      return name.includes(q) || ev.includes(q) || subj.includes(q) || msg.includes(q);
    });
  }, [conversations, search]);

  const grouped = useMemo(() => {
    if (!groupByEvent) return null;
    const map = new Map<string, { title: string; eventId: string | null; items: Conversation[] }>();
    filteredConvs.forEach((c) => {
      const key = c.event_id || "__no_event__";
      const title = c.event?.title || (c.type === "user_organizer" ? "Evento removido" : "Suporte / Sem evento");
      if (!map.has(key)) map.set(key, { title, eventId: c.event_id, items: [] });
      map.get(key)!.items.push(c);
    });
    // Sort: events with most recent activity first
    return Array.from(map.values()).sort((a, b) => {
      const ta = Math.max(...a.items.map((x) => new Date(x.updated_at).getTime()));
      const tb = Math.max(...b.items.map((x) => new Date(x.updated_at).getTime()));
      return tb - ta;
    });
  }, [filteredConvs, groupByEvent]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user_organizer":
        return <Building2 className="h-3 w-3" />;
      case "organizer_admin":
      case "user_admin":
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "user_organizer":
        return "Evento";
      case "organizer_admin":
      case "user_admin":
        return "Suporte";
      default:
        return type;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Carregando conversas...</div>;
  }

  if (filteredConvs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</p>
      </div>
    );
  }

  const renderItem = (conv: Conversation) => (
    <button
      key={conv.id}
      onClick={() => onSelectConversation(conv)}
      className={cn(
        "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
        selectedId === conv.id && "bg-muted"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={conv.other_participant?.photo_url || undefined} />
        <AvatarFallback className={cn(
          (conv.other_participant?.is_organizer || conv.other_participant?.is_support) &&
            "bg-primary/15 text-primary"
        )}>
          {conv.other_participant?.is_support
            ? <Shield className="h-5 w-5" />
            : conv.other_participant?.is_organizer
              ? <Building2 className="h-5 w-5" />
              : getInitials(conv.other_participant?.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <p className="font-semibold truncate">{conv.other_participant?.full_name || "Usuário"}</p>
            {(conv.other_participant?.is_organizer || conv.other_participant?.is_support) && (
              <Shield className="h-3 w-3 text-primary shrink-0" />
            )}
          </div>
          {conv.last_message && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {getTypeIcon(conv.type)}
            <span className="ml-1">{getTypeLabel(conv.type)}</span>
          </Badge>
          {!groupByEvent && conv.event?.title && (
            <span className="text-xs text-muted-foreground truncate">{conv.event.title}</span>
          )}
        </div>
        {conv.last_message && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {conv.last_message.sender_id === user?.id && "Você: "}
            {conv.last_message.content}
          </p>
        )}
      </div>
      {conv.unread_count > 0 && (
        <Badge className="h-5 min-w-5 px-1.5 justify-center shrink-0">{conv.unread_count}</Badge>
      )}
    </button>
  );

  if (groupByEvent && grouped) {
    return (
      <ScrollArea className="h-full">
        <div>
          {grouped.map((group) => {
            const totalUnread = group.items.reduce((s, c) => s + (c.unread_count || 0), 0);
            return (
              <div key={group.eventId ?? "no_event"} className="border-b border-border last:border-b-0">
                <div className="px-4 py-2 bg-muted/40 flex items-center gap-2 sticky top-0 z-[1]">
                  <Ticket className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-xs font-semibold truncate flex-1">{group.title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {group.items.length} {group.items.length === 1 ? "conversa" : "conversas"}
                  </span>
                  {totalUnread > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] justify-center shrink-0">{totalUnread}</Badge>
                  )}
                </div>
                <div className="divide-y divide-border">{group.items.map(renderItem)}</div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">{filteredConvs.map(renderItem)}</div>
    </ScrollArea>
  );
}
