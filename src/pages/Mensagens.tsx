import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ArrowLeft, Plus, Users, Building2, Shield, Search } from "lucide-react";
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
    email: string;
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
        .from("profiles")
        .select("id, full_name, email, photo_url")
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
          other_participant: { id: participantId, full_name: null, photo_url: null, email: "" },
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
        other_participant: { id: participantId, full_name: null, photo_url: null, email: "" },
      });
      setShowNewChat(false);
    } catch (err: any) {
      console.error("Erro ao iniciar conversa:", err.message);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
        <PageLoading />
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />

      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
        <div className="container px-4 py-6">
          {/* Breadcrumb */}
          <Breadcrumb 
            items={[{ label: "Mensagens" }]} 
            className="mb-4"
          />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-display text-2xl font-bold">Mensagens</h1>
                <p className="text-sm text-muted-foreground">Suas conversas</p>
              </div>
            </div>
            <Button onClick={() => setShowNewChat(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>

          <div className="grid lg:grid-cols-[350px_1fr] gap-6 h-[calc(100vh-220px)]">
            {/* Conversations List */}
            <div className="bg-card rounded-2xl border overflow-hidden">
              <Tabs defaultValue="all" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b p-1 h-auto flex-wrap">
                  <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                  <TabsTrigger value="user_organizer" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" /> Eventos
                  </TabsTrigger>
                  <TabsTrigger value="support" className="text-xs gap-1">
                    <Shield className="h-3 w-3" /> Suporte
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                  />
                </TabsContent>
                <TabsContent value="user_organizer" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    filter="user_organizer"
                  />
                </TabsContent>
                <TabsContent value="support" className="flex-1 m-0 overflow-hidden">
                  <ConversationsList
                    onSelectConversation={(conv) => setSelectedConversation(conv)}
                    selectedId={selectedConversation?.id}
                    filter={isOrganizer ? "organizer_admin" : "user_admin"}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat Window */}
            <div className="bg-card rounded-2xl border overflow-hidden">
              {selectedConversation ? (
                <ChatWindow
                  conversationId={selectedConversation.id}
                  otherParticipant={{
                    id: selectedConversation.other_participant?.id || "",
                    name: selectedConversation.other_participant?.full_name || 
                          selectedConversation.other_participant?.email || "Usuário",
                    photo_url: selectedConversation.other_participant?.photo_url,
                  }}
                  onClose={() => setSelectedConversation(null)}
                  className="h-full border-0 rounded-none"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Selecione uma conversa</p>
                    <p className="text-sm">ou inicie uma nova</p>
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
