import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Eye, Search, Users, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string | null;
    email: string;
  };
}

interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  participant_1: {
    id: string;
    full_name: string | null;
    email: string;
    photo_url: string | null;
  };
  participant_2: {
    id: string;
    full_name: string | null;
    email: string;
    photo_url: string | null;
  };
  event?: {
    title: string;
  };
  message_count: number;
  last_message?: Message;
}

export default function AdminChats() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);

  // Fetch all conversations
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-conversations", filterType],
    queryFn: async () => {
      let query = supabase
        .from("conversations")
        .select("*, events(title)")
        .order("updated_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("type", filterType);
      }

      const { data: convs, error } = await query;
      if (error) throw error;

      // Enrich with participant data and last message
      const enriched = await Promise.all(
        (convs || []).map(async (conv) => {
          const [{ data: p1 }, { data: p2 }, { data: lastMsg }, { count }] = await Promise.all([
            supabase.from("profiles").select("id, full_name, email, photo_url").eq("id", conv.participant_1_id).maybeSingle(),
            supabase.from("profiles").select("id, full_name, email, photo_url").eq("id", conv.participant_2_id).maybeSingle(),
            supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabase.from("messages").select("*", { count: "exact", head: true }).eq("conversation_id", conv.id),
          ]);

          return {
            ...conv,
            participant_1: p1,
            participant_2: p2,
            last_message: lastMsg,
            message_count: count || 0,
          };
        })
      );

      return enriched as Conversation[];
    },
    refetchInterval: 5000,
  });

  // Real-time subscription for all new messages
  useEffect(() => {

    const channel = supabase
      .channel("admin-all-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", newMsg.sender_id)
            .maybeSingle();

          setLiveMessages((prev) => [
            { ...newMsg, sender },
            ...prev.slice(0, 49),
          ]);
          
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "user_organizer": return "Usuário ↔ Organizador";
      case "organizer_admin": return "Organizador ↔ Admin";
      case "user_admin": return "Usuário ↔ Admin";
      default: return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "user_organizer": 
        return <Badge variant="secondary" className="gap-1"><Building2 className="h-3 w-3" />Evento</Badge>;
      case "organizer_admin": 
        return <Badge className="gap-1 bg-primary"><Shield className="h-3 w-3" />Org. Suporte</Badge>;
      case "user_admin": 
        return <Badge className="gap-1 bg-success"><Users className="h-3 w-3" />User Suporte</Badge>;
      default: 
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.participant_1?.full_name?.toLowerCase().includes(search) ||
      conv.participant_1?.email?.toLowerCase().includes(search) ||
      conv.participant_2?.full_name?.toLowerCase().includes(search) ||
      conv.participant_2?.email?.toLowerCase().includes(search) ||
      conv.event?.title?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Central de Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Monitore todas as conversas em tempo real
        </p>
      </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{conversations.length}</p>
                    <p className="text-xs text-muted-foreground">Total Conversas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {conversations.filter(c => c.type === "user_organizer").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Eventos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold">
                      {conversations.filter(c => c.type === "user_admin" || c.type === "organizer_admin").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Suporte</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold">
                      {conversations.filter(c => c.status === "open").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Abertas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Conversations List */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Todas as Conversas</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="user_organizer">Eventos</SelectItem>
                        <SelectItem value="user_admin">Usuário</SelectItem>
                        <SelectItem value="organizer_admin">Organizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {isLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhuma conversa encontrada
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={cn(
                            "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedConversation?.id === conv.id && "bg-muted"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex -space-x-2">
                              <Avatar className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={conv.participant_1?.photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(conv.participant_1?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <Avatar className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={conv.participant_2?.photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(conv.participant_2?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeBadge(conv.type)}
                                <span className="text-xs text-muted-foreground">
                                  {conv.message_count} msgs
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate">
                                {conv.participant_1?.full_name || conv.participant_1?.email} ↔{" "}
                                {conv.participant_2?.full_name || conv.participant_2?.email}
                              </p>
                              {conv.event?.title && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Evento: {conv.event.title}
                                </p>
                              )}
                              {conv.last_message && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {conv.last_message.content}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(conv.updated_at), "dd/MM HH:mm")}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Live Messages Feed */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  Mensagens em Tempo Real
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {liveMessages.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aguardando novas mensagens...</p>
                      </div>
                    ) : (
                      liveMessages.map((msg) => (
                        <div key={msg.id} className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {msg.sender?.full_name || msg.sender?.email || "Usuário"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

      {/* Selected Conversation Chat */}
      {selectedConversation && (
        <Card className="overflow-hidden">
          <ChatWindow
            conversationId={selectedConversation.id}
            otherParticipant={{
              id: selectedConversation.participant_1.id,
              name: `${selectedConversation.participant_1.full_name || selectedConversation.participant_1.email} ↔ ${selectedConversation.participant_2.full_name || selectedConversation.participant_2.email}`,
            }}
            onClose={() => setSelectedConversation(null)}
            className="h-[400px] border-0"
          />
        </Card>
      )}
    </div>
  );
}
