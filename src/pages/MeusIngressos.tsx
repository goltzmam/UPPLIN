import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, QrCode, Ticket, Download, X } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function MeusIngressos() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

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
          events(title, start_at, venue_name, cover_image_url),
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

  if (loading || isLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
        <PageLoading />
      </main>
      <BottomNav />
    </div>
  );

  const upcomingTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) >= new Date() && t.status === "issued"
  ) || [];

  const pastTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) < new Date() || t.status !== "issued"
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

  const TicketCard = ({ ticket }: { ticket: any }) => {
    const eventDate = new Date(ticket.events?.start_at);
    const isPast = eventDate < new Date();

    return (
      <div className={`bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden ${isPast ? "opacity-70" : ""}`}>
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
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedTicket(ticket)}>
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  Ver QR Code
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Baixar PDF
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-center">Seu Ingresso</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <TicketQRCode
              ticketId={selectedTicket.id}
              qrToken={selectedTicket.qr_token || selectedTicket.id}
              eventTitle={selectedTicket.events?.title || "Evento"}
              ticketType={selectedTicket.ticket_types?.name || "Ingresso"}
              date={format(eventDate, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              status={selectedTicket.status as "issued" | "used" | "cancelled"}
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Apresente este QR Code na entrada do evento
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <TikTokDesktopSidebar />
      <QRCodeModal />

      <main className="pb-24 lg:pb-8 lg:ml-[72px]">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Breadcrumb - desktop only */}
          <div className="hidden lg:block">
            <Breadcrumb 
              items={[{ label: "Meus Ingressos" }]} 
              className="mb-4"
            />
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">Meus Ingressos</h1>

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
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
