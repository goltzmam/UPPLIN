import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, QrCode, Ticket, Download, Clock, CreditCard, MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketQRCode } from "@/components/tickets/TicketQRCode";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function MeusIngressos() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-tickets", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["my-pending-orders", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && !profile?.cpf) {
      navigate("/onboarding");
    }
  }, [loading, user, profile, navigate]);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          events(id, title, start_at, venue_name, cover_image_url, organizer_id, organizer_accounts!organizer_id(owner_user_id, display_name)),
          ticket_types(name, price_cents)
        `)
        .eq("buyer_user_id", user!.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`my-tickets-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `buyer_user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedTicket = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ["my-tickets", user.id] });
          setSelectedTicket((current: any) =>
            current?.id && updatedTicket?.id === current.id ? { ...current, ...updatedTicket } : current
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  useEffect(() => {
    if (!selectedTicket?.id || !tickets) return;
    const freshTicket = tickets.find((ticket: any) => ticket.id === selectedTicket.id);
    if (freshTicket && freshTicket.status !== selectedTicket.status) {
      setSelectedTicket(freshTicket);
    }
  }, [selectedTicket?.id, selectedTicket?.status, tickets]);

  const handleContactOrganizer = useCallback(async (ticket: any) => {
    if (!user) return;
    const eventId = ticket.events?.id;
    if (!eventId) {
      toast({ title: "Não foi possível abrir o chat", description: "Evento não encontrado.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.rpc("open_event_conversation", { p_event_id: eventId });
      if (error) {
        const msg = error.message || "";
        if (/organizer_offline/i.test(msg)) {
          toast({ title: "Organizador offline", description: "Ele está indisponível no chat agora. Tente mais tarde.", variant: "destructive" });
        } else if (/no_ticket/i.test(msg)) {
          toast({ title: "Sem acesso", description: "Compre um ingresso para falar com o organizador.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao abrir conversa", description: msg, variant: "destructive" });
        }
        return;
      }
      const conversationId = (data as any)?.conversation_id;
      if ((data as any)?.self) {
        navigate("/mensagens");
        return;
      }
      navigate(conversationId ? `/mensagens?c=${conversationId}` : "/mensagens");
    } catch (e: any) {
      toast({ title: "Erro ao abrir conversa", description: e?.message || "Tente novamente", variant: "destructive" });
    }
  }, [user, navigate, toast]);

  const { data: pendingOrders } = useQuery({
    queryKey: ["my-pending-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          events(title, start_at, venue_name, cover_image_url),
          order_items(qty, unit_price_cents, ticket_types(name))
        `)
        .eq("buyer_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  if (loading || isLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe">
        <PageLoading />
      </main>
      <BottomNav />
    </div>
  );

  const upcomingTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) >= new Date() && t.status !== "cancelled"
  ) || [];

  const pastTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) < new Date() || t.status === "cancelled"
  ) || [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge variant="default" className="bg-success text-[10px] sm:text-xs">Válido</Badge>;
      case "used":
        return <Badge variant="secondary" className="text-[10px] sm:text-xs">Utilizado</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-[10px] sm:text-xs">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const PendingOrderCard = ({ order }: { order: any }) => {
    const eventDate = order.events?.start_at ? new Date(order.events.start_at) : null;
    const isExpired = order.expires_at && new Date(order.expires_at) < new Date();

    if (isExpired) return null;

    return (
      <div className="bg-card rounded-xl sm:rounded-2xl border border-yellow-500/40 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-40 md:w-48 h-28 sm:h-auto relative shrink-0">
            {order.events?.cover_image_url ? (
              <img src={order.events.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-secondary flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="flex-1 p-3 sm:p-4 md:p-6 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] sm:text-xs text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Pagamento Pendente
                  </Badge>
                </div>
                <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5 truncate">{order.events?.title}</h3>
                <div className="flex flex-wrap gap-3 text-[11px] sm:text-sm text-muted-foreground">
                  {eventDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span>{format(eventDate, "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                  {order.events?.venue_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">{order.events.venue_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span>R$ {(order.total_cents / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button 
                size="sm" 
                className="text-xs h-8"
                onClick={() => navigate(`/pagamento-pendente/${order.id}`)}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Pagar Agora
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TicketCard = ({ ticket }: { ticket: any }) => {
    const eventDate = new Date(ticket.events?.start_at);
    const isPast = eventDate < new Date();
    const isUsed = ticket.status === "used";

    return (
      <div className={`bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden ${isPast && !isUsed ? "opacity-70" : ""}`}>
        <div className="flex flex-col sm:flex-row">
          {/* Event Image */}
          <div className="sm:w-40 md:w-48 h-28 sm:h-auto relative shrink-0">
            {ticket.events?.cover_image_url ? (
              <img src={ticket.events.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 sm:p-4 md:p-6 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {statusBadge(ticket.status)}
                  <span className="text-[10px] sm:text-sm text-muted-foreground truncate">{ticket.ticket_types?.name}</span>
                </div>
                <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5 truncate">{ticket.events?.title}</h3>
                <div className="flex flex-wrap gap-3 text-[11px] sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span>{format(eventDate, "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                  </div>
                  {ticket.events?.venue_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">{ticket.events.venue_name}</span>
                    </div>
                  )}
                </div>
                {isUsed && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-medium text-success">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Check-in confirmado. Sua entrada foi validada.</span>
                  </div>
                )}
              </div>

              {/* QR Code Preview - desktop only */}
              {ticket.status === "issued" && !isPast && (
                <div className="hidden md:flex flex-col items-center gap-2 shrink-0">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{ticket.qr_token?.slice(0, 8)}...</span>
                </div>
              )}
            </div>

            {ticket.status === "issued" && !isPast && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedTicket(ticket)}>
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  Ver QR Code
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleContactOrganizer(ticket)}>
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Falar com organizador
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Baixar PDF
                </Button>
              </div>
            )}

            {isUsed && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedTicket(ticket)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Ver check-in
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const QRCodeModal = () => {
    if (!selectedTicket) return null;
    const eventDate = new Date(selectedTicket.events?.start_at);

    return (
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:max-w-md p-0 overflow-hidden max-h-[90dvh] flex flex-col gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 shrink-0">
            <DialogTitle className="text-center text-base sm:text-lg">Seu Ingresso</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto overscroll-contain flex-1">
            <TicketQRCode
              ticketId={selectedTicket.id}
              qrToken={selectedTicket.qr_token || selectedTicket.id}
              eventTitle={selectedTicket.events?.title || "Evento"}
              ticketType={selectedTicket.ticket_types?.name || "Ingresso"}
              date={format(eventDate, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              venue={selectedTicket.events?.venue_name}
              status={selectedTicket.status as "issued" | "used" | "cancelled"}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const activePendingOrders = pendingOrders?.filter(
    (o) => !o.expires_at || new Date(o.expires_at) > new Date()
  ) || [];

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <TikTokDesktopSidebar />
      <QRCodeModal />

      <main className="pb-app-bottom-safe lg:ml-[72px]">
        <PullToRefresh onRefresh={handleRefresh} className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Breadcrumb - desktop only */}
          <div className="hidden lg:block">
            <Breadcrumb 
              items={[{ label: "Meus Ingressos" }]} 
              className="mb-4"
            />
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">Meus Ingressos</h1>

          {/* Pending Orders Section */}
          {activePendingOrders.length > 0 && (
            <div className="mb-6 space-y-3">
              <h2 className="font-display text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pagamentos Pendentes ({activePendingOrders.length})
              </h2>
              {activePendingOrders.map((order) => (
                <PendingOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upcoming" className="flex-1 sm:flex-none text-xs sm:text-sm">Próximos ({upcomingTickets.length})</TabsTrigger>
              <TabsTrigger value="past" className="flex-1 sm:flex-none text-xs sm:text-sm">Anteriores ({pastTickets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3 sm:space-y-4">
              {upcomingTickets.length > 0 ? (
                upcomingTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
              ) : (
                <EmptyState
                  icon={<Ticket className="h-8 w-8 text-accent" />}
                  title="Nenhum ingresso próximo"
                  description="Você ainda não tem ingressos para eventos futuros."
                  variant="default"
                  action={<Button onClick={() => navigate("/eventos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Explorar Eventos</Button>}
                />
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 sm:space-y-4">
              {pastTickets.length > 0 ? (
                pastTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
              ) : (
                <EmptyState
                  icon={<Ticket className="h-8 w-8 text-accent" />}
                  title="Nenhum histórico"
                  description="Seus ingressos anteriores aparecerão aqui."
                  variant="default"
                />
              )}
            </TabsContent>
          </Tabs>
        </PullToRefresh>
      </main>

      <BottomNav />
    </div>
  );
}
