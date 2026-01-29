import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, QrCode, Ticket, Download, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
  });

  if (loading || isLoading) return <><Header /><PageLoading /><Footer /></>;

  const upcomingTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) >= new Date() && t.status === "issued"
  ) || [];

  const pastTickets = tickets?.filter(
    (t) => new Date(t.events?.start_at) < new Date() || t.status !== "issued"
  ) || [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge variant="default" className="bg-success">Válido</Badge>;
      case "used":
        return <Badge variant="secondary">Utilizado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const TicketCard = ({ ticket }: { ticket: any }) => {
    const eventDate = new Date(ticket.events?.start_at);
    const isPast = eventDate < new Date();

    return (
      <div className={`bg-card rounded-2xl border border-border overflow-hidden ${isPast ? "opacity-70" : ""}`}>
        <div className="flex flex-col md:flex-row">
          {/* Event Image */}
          <div className="md:w-48 h-32 md:h-auto relative shrink-0">
            {ticket.events?.cover_image_url ? (
              <img src={ticket.events.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {statusBadge(ticket.status)}
                  <span className="text-sm text-muted-foreground">{ticket.ticket_types?.name}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{ticket.events?.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(eventDate, "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                  </div>
                  {ticket.events?.venue_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{ticket.events.venue_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Preview */}
              {ticket.status === "issued" && !isPast && (
                <div className="hidden md:flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <QrCode className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{ticket.qr_token?.slice(0, 8)}...</span>
                </div>
              )}
            </div>

            {ticket.status === "issued" && !isPast && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Ver QR Code
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <QRCodeModal />

      <main className="flex-1 py-8 pt-24">
        <div className="container px-4">
          {/* Breadcrumb */}
          <Breadcrumb 
            items={[{ label: "Meus Ingressos" }]} 
            className="mb-4"
          />
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Meus Ingressos</h1>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upcoming" className="flex-1 sm:flex-none">Próximos ({upcomingTickets.length})</TabsTrigger>
              <TabsTrigger value="past" className="flex-1 sm:flex-none">Anteriores ({pastTickets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingTickets.length > 0 ? (
                upcomingTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
              ) : (
                <EmptyState
                  icon={<Ticket className="h-8 w-8 text-muted-foreground" />}
                  title="Nenhum ingresso próximo"
                  description="Você ainda não tem ingressos para eventos futuros."
                  action={<Button onClick={() => navigate("/eventos")}>Explorar Eventos</Button>}
                />
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastTickets.length > 0 ? (
                pastTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
              ) : (
                <EmptyState
                  icon={<Ticket className="h-8 w-8 text-muted-foreground" />}
                  title="Nenhum histórico"
                  description="Seus ingressos anteriores aparecerão aqui."
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
