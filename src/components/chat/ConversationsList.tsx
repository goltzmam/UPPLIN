import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Plus, User, Building2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
    email: string;
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
}

export function ConversationsList({ onSelectConversation, selectedId, filter = "all" }: ConversationsListProps) {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("conversations")
        .select(`
          *,
          events(title)
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data: convs, error } = await query;
      if (error) throw error;

      // Fetch other participants and last messages
      const enrichedConvs = await Promise.all(
        (convs || []).map(async (conv) => {
          const otherParticipantId = conv.participant_1_id === user.id 
            ? conv.participant_2_id 
            : conv.participant_1_id;

          // Get other participant profile
          const { data: participantData } = await supabase
            .from("profiles")
            .select("id, full_name, photo_url, email")
            .eq("id", otherParticipantId)
            .maybeSingle();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .is("read_at", null);

          return {
            ...conv,
            other_participant: participantData,
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

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user_organizer": return <Building2 className="h-3 w-3" />;
      case "organizer_admin": return <Shield className="h-3 w-3" />;
      case "user_admin": return <Shield className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "user_organizer": return "Evento";
      case "organizer_admin": return "Suporte";
      case "user_admin": return "Suporte";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Carregando conversas...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma conversa ainda</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((conv) => (
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
              <AvatarFallback>{getInitials(conv.other_participant?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate">
                  {conv.other_participant?.full_name || conv.other_participant?.email || "Usuário"}
                </p>
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
                {conv.event?.title && (
                  <span className="text-xs text-muted-foreground truncate">
                    {conv.event.title}
                  </span>
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
              <Badge className="h-5 min-w-5 px-1.5 justify-center shrink-0">
                {conv.unread_count}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
