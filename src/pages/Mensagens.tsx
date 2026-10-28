import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";

import { loadConversations, startChat, type ChatConversation as Conversation } from "@/lib/chat";
import { useToast } from "@/hooks/use-toast";

export default function Mensagens() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const [starting, setStarting] = useState(false);
  const { isAdmin, isOrganizer } = useUserRoles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);


  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Auto-select conversation from ?c= query param
  const requestedConvId = searchParams.get("c");
  useEffect(() => {
    if (!user || !requestedConvId) return;
    if (selectedConversation?.id === requestedConvId) return;
    (async () => {
      try {
        const [conv] = await loadConversations(user.id, { id: requestedConvId });
        if (!conv) return;
        setSelectedConversation(conv);
      } catch {
        toast({ title: "Não foi possível abrir a conversa", description: "Tente novamente.", variant: "destructive" });
        return;
      }
      // Clean up the query param so refreshes don't keep forcing selection
      const next = new URLSearchParams(searchParams);
      next.delete("c");
      setSearchParams(next, { replace: true });
    })();
  }, [user, requestedConvId, searchParams, selectedConversation?.id, setSearchParams, toast]);


  // Fetch events for organizer chat
  const { data: userEvents = [] } = useQuery({
    queryKey: ["user-events-for-chat", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .eq("status", "published");
      return data || [];
    },
    enabled: !!user && !isOrganizer && !isAdmin,
  });

  const startNewConversation = async (type: string, eventId?: string) => {
    if (!user || starting) return;
    setStarting(true);
    try {
      const id = await startChat(type, eventId);
      const [conversation] = await loadConversations(user.id, { id });
      if (!conversation) throw new Error("Conversation unavailable");
      setSelectedConversation(conversation);
      setShowNewChat(false);
      void client.invalidateQueries({ queryKey: ["conversations", user.id] });
    } catch {
      toast({ title: "Não foi possível iniciar a conversa", description: "O contato pode estar indisponível. Tente novamente.", variant: "destructive" });
    } finally { setStarting(false); }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe">
        <PageLoading />
      </main>
      {!selectedConversation && <BottomNav />}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <TikTokDesktopSidebar />

      <main
        className={cn(
          "lg:ml-[72px] min-h-[100dvh]",
          // On mobile: hide BottomNav padding when a chat is open (full-screen chat)
          selectedConversation ? "pb-0" : "pb-app-bottom-safe lg:pb-0"
        )}
      >
        <div
          className={cn(
            "w-full mx-auto",
            // Full-bleed on mobile when chat selected; normal padding otherwise
            selectedConversation
              ? "max-w-6xl px-0 sm:px-4 py-0 sm:py-6"
              : "max-w-6xl px-3 sm:px-4 py-4 sm:py-6"
          )}
        >
          {/* Breadcrumb - desktop only */}
          <div className="hidden lg:block">
            <Breadcrumb
              items={[{ label: "Mensagens" }]}
              className="mb-4"
            />
          </div>

          {/* Page header - hidden on mobile when chat is open */}
          <div
            className={cn(
              "flex items-center justify-between mb-4 sm:mb-6 px-3 sm:px-0",
              selectedConversation && "hidden lg:flex"
            )}
          >
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

          {/* Mobile: full-height stacked layout, Desktop: side-by-side */}
          <div
            className={cn(
              "flex flex-col lg:grid lg:grid-cols-[350px_1fr] gap-0 lg:gap-6",
              // Mobile full-height when chat open; otherwise let list scroll naturally
              selectedConversation
                ? "h-[100dvh] lg:h-[calc(100vh-220px)]"
                : "h-[calc(100dvh-160px)] lg:h-[calc(100vh-220px)]"
            )}
          >
            {/* Conversations List - hide on mobile when chat is selected */}
            <div
              className={cn(
                "bg-card border overflow-hidden flex flex-col min-h-0",
                "rounded-none sm:rounded-xl lg:rounded-2xl",
                selectedConversation ? "hidden lg:flex" : "flex-1 lg:flex"
              )}
            >
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
                <TabsList className="w-full justify-start rounded-none border-b p-1 h-auto overflow-x-auto">
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

            {/* Chat Window - full screen on mobile when selected */}
            <div
              className={cn(
                "bg-card border overflow-hidden flex flex-col min-h-0",
                "rounded-none sm:rounded-xl lg:rounded-2xl",
                selectedConversation ? "flex-1" : "hidden lg:flex"
              )}
            >
              {selectedConversation ? (
                <ChatWindow
                  key={selectedConversation.id}
                  conversationId={selectedConversation.id}
                  identities={selectedConversation.participants}
                  otherParticipant={{
                    id: selectedConversation.other_participant?.id || "",
                    name: selectedConversation.other_participant?.full_name || "Usuário",
                    photo_url: selectedConversation.other_participant?.photo_url,
                    subtitle: selectedConversation.other_participant?.subtitle,
                    is_organizer: selectedConversation.other_participant?.is_organizer,
                    is_support: selectedConversation.other_participant?.is_support,
                    profile_path: selectedConversation.other_participant?.profile_path,
                    cover_photo_url: selectedConversation.other_participant?.cover_photo_url,
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
            {!isAdmin && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    void startNewConversation(isOrganizer ? "organizer_admin" : "user_admin");
                  }}
                  disabled={starting}
                >
                  <Shield className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">
                      {isOrganizer ? "Suporte para Organizadores" : "Suporte UPPLIN"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fale com a equipe oficial: problemas, bugs, conflitos ou dúvidas
                    </p>
                  </div>
                </Button>

                {isOrganizer && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => startNewConversation("user_admin")}
                  >
                    <Shield className="h-5 w-5 mr-3 text-success" />
                    <div className="text-left">
                      <p className="font-medium">Suporte como Participante</p>
                      <p className="text-sm text-muted-foreground">
                        Falar com o suporte sobre uma compra ou conta pessoal
                      </p>
                    </div>
                  </Button>
                )}

                {!isOrganizer && userEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conversar sobre um evento:</p>
                    {userEvents.slice(0, 5).map((event) => (
                      <Button
                        key={event.id}
                        variant="outline"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => startNewConversation(
                          "user_organizer",
                          event.id
                        )}
                      >
                        <Building2 className="h-4 w-4 mr-2 text-primary" />
                        <div className="text-left">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Fale com o organizador
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            {isAdmin && (
              <p className="text-sm text-muted-foreground text-center">
                A equipe de suporte acompanha as conversas na central de atendimento.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!selectedConversation && <BottomNav />}
    </div>
  );
}
