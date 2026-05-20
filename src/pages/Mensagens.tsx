import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ArrowLeft, Plus, Users, Building2, Shield, Search, Ticket } from "lucide-react";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationsList } from "@/components/chat/ConversationsList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/ui/loading";

interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  event_id: string | null;
  participant_1_id: string;
  participant_2_id: string;
  status: string;
  other_participant?: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
  };
}

export default function Mensagens() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isOrganizer } = useUserRoles();
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatType, setNewChatType] = useState<string>("");
  const [searchUser, setSearchUser] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch admin users for support chat
  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users-for-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (!data || data.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .in("id", data.map(r => r.user_id));

      return profiles || [];
    },
    enabled: !!user,
  });

  // Fetch events for organizer chat
  const { data: userEvents = [] } = useQuery({
    queryKey: ["user-events-for-chat", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, organizer_id, organizer_accounts(owner_user_id, display_name)")
        .eq("status", "published");
      return data || [];
    },
    enabled: !!user && !isOrganizer && !isAdmin,
  });

  const startNewConversation = async (type: string, participantId: string, eventId?: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("type", type)
        .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${participantId}),and(participant_1_id.eq.${participantId},participant_2_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        setSelectedConversation({
          ...existing,
          other_participant: { id: participantId, full_name: null, photo_url: null },
        });
        setShowNewChat(false);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          type,
          participant_1_id: user.id,
          participant_2_id: participantId,
          event_id: eventId || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedConversation({
        ...newConv,
        other_participant: { id: participantId, full_name: null, photo_url: null },
      });
      setShowNewChat(false);
    } catch (err: any) {
      console.error("Erro ao iniciar conversa:", err.message);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe">
        <PageLoading />
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />

      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Breadcrumb - desktop only */}
          <div className="hidden lg:block">
            <Breadcrumb 
              items={[{ label: "Mensagens" }]} 
              className="mb-4"
            />
          </div>
          
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-2xl font-bold truncate">Mensagens</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Suas conversas</p>
              </div>
            </div>
            <Button size="sm" className="shrink-0 text-xs sm:text-sm" onClick={() => setShowNewChat(true)}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nova Conversa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>

          {/* Mobile: stacked layout, Desktop: side-by-side */}
          <div className="flex flex-col lg:grid lg:grid-cols-[350px_1fr] gap-4 sm:gap-6 h-auto lg:h-[calc(100vh-220px)]">
            {/* Conversations List */}
            {/* Conversations - hide on mobile when chat is selected */}
            <div className={`bg-card rounded-xl sm:rounded-2xl border overflow-hidden min-h-[300px] lg:min-h-0 flex flex-col ${selectedConversation ? 'hidden lg:block' : ''}`}>
              {/* Search bar */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, evento ou mensagem..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b p-1 h-auto">
                  <TabsTrigger value="all" className="text-[10px] sm:text-xs">Todas</TabsTrigger>
                  <TabsTrigger value="by_event" className="text-[10px] sm:text-xs gap-1">
                    <Ticket className="h-3 w-3" /> Por Evento
                  </TabsTrigger>
                  <TabsTrigger value="user_organizer" className="text-[10px] sm:text-xs gap-1">
                    <Building2 className="h-3 w-3" /> Eventos
                  </TabsTrigger>
                  <TabsTrigger value="support" className="text-[10px] sm:text-xs gap-1">
                    <Shield className="h-3 w-3" /> Suporte
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    search={searchQuery}
                  />
                </TabsContent>
                <TabsContent value="by_event" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    search={searchQuery}
                    groupByEvent
                  />
                </TabsContent>
                <TabsContent value="user_organizer" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    filter="user_organizer"
                    search={searchQuery}
                    groupByEvent
                  />
                </TabsContent>
                <TabsContent value="support" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    filter={isOrganizer ? "organizer_admin" : "user_admin"}
                    search={searchQuery}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat Window - full width on mobile when selected */}
            <div className={`bg-card rounded-xl sm:rounded-2xl border overflow-hidden min-h-[400px] lg:min-h-0 ${selectedConversation ? '' : 'hidden lg:block'}`}>
              {selectedConversation ? (
                <ChatWindow
                  conversationId={selectedConversation.id}
                  otherParticipant={{
                    id: selectedConversation.other_participant?.id || "",
                    name: selectedConversation.other_participant?.full_name || "Usuário",
                    photo_url: selectedConversation.other_participant?.photo_url,
                  }}
                  onClose={() => setSelectedConversation(null)}
                  className="h-full border-0 rounded-none"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground py-16">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-lg font-medium">Selecione uma conversa</p>
                    <p className="text-xs sm:text-sm">ou inicie uma nova</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>Escolha o tipo de conversa que deseja iniciar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isAdmin && !isOrganizer && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    if (adminUsers.length > 0) {
                      startNewConversation("user_admin", adminUsers[0].id);
                    }
                  }}
                >
                  <Shield className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Suporte da Plataforma</p>
                    <p className="text-sm text-muted-foreground">Fale com a equipe de suporte</p>
                  </div>
                </Button>

                {userEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conversar sobre um evento:</p>
                    {userEvents.slice(0, 5).map((event: any) => (
                      <Button
                        key={event.id}
                        variant="outline"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => startNewConversation(
                          "user_organizer", 
                          event.organizer_accounts?.owner_user_id,
                          event.id
                        )}
                      >
                        <Building2 className="h-4 w-4 mr-2 text-primary" />
                        <div className="text-left">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.organizer_accounts?.display_name}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            {isOrganizer && !isAdmin && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  if (adminUsers.length > 0) {
                    startNewConversation("organizer_admin", adminUsers[0].id);
                  }
                }}
              >
                <Shield className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Suporte para Organizadores</p>
                  <p className="text-sm text-muted-foreground">Fale com a equipe de suporte</p>
                </div>
              </Button>
            )}

            {isAdmin && (
              <p className="text-sm text-muted-foreground text-center">
                Como administrador, você pode ver todas as conversas no painel admin.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
