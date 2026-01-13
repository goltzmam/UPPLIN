import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Share2, Heart, Minus, Plus, Ticket } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TicketSelection {
  [ticketTypeId: string]: number;
}

export default function Evento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selection, setSelection] = useState<TicketSelection>({});
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(*), organizer_accounts(display_name)`)
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateSelection = (ticketTypeId: string, delta: number) => {
    setSelection((prev) => {
      const current = prev[ticketTypeId] || 0;
      const newVal = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [ticketTypeId]: newVal };
    });
  };

  const totalItems = Object.values(selection).reduce((a, b) => a + b, 0);
  const totalCents = event?.ticket_types?.reduce((acc: number, tt: any) => {
    const qty = selection[tt.id] || 0;
    return acc + qty * (tt.price_cents || 0);
  }, 0) || 0;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: "Faça login para comprar", description: "Você precisa estar logado para comprar ingressos." });
      navigate("/login");
      return;
    }

    if (totalItems === 0) {
      toast({ title: "Selecione ingressos", description: "Escolha pelo menos um ingresso.", variant: "destructive" });
      return;
    }

    setCheckingOut(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_user_id: user.id,
          event_id: event!.id,
          total_cents: totalCents,
          status: "pending",
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = Object.entries(selection)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, qty]) => {
          const tt = event!.ticket_types!.find((t: any) => t.id === ticketTypeId);
          return {
            order_id: order.id,
            ticket_type_id: ticketTypeId,
            unit_price_cents: tt?.price_cents || 0,
            qty,
          };
        });

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      toast({ title: "Pedido criado!", description: "Redirecionando para pagamento..." });
      navigate(`/checkout/${order.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCheckingOut(false);
    }
  };

  if (isLoading) return <><Header /><PageLoading /><Footer /></>;

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <EmptyState
            icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
            title="Evento não encontrado"
            description="Este evento não existe ou não está disponível."
            action={<Button onClick={() => navigate("/eventos")}>Ver outros eventos</Button>}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = new Date(event.start_at);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Cover */}
        <div className="relative h-[40vh] min-h-[300px] bg-secondary">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container relative -mt-24 z-10 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Event Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-lg animate-fade-up">
                <Badge className="mb-4">{format(eventDate, "EEEE", { locale: ptBR })}</Badge>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>

                <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{format(eventDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{format(eventDate, "HH:mm")}</span>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{event.venue_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Share2 className="h-4 w-4 mr-2" />Compartilhar</Button>
                  <Button variant="outline" size="sm"><Heart className="h-4 w-4 mr-2" />Salvar</Button>
                </div>
              </div>

              {/* Description */}
              <div className="bg-card rounded-2xl border border-border p-6 animate-fade-up stagger-1">
                <h2 className="font-display text-xl font-bold mb-4">Sobre o evento</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description || "Sem descrição disponível."}</p>
              </div>

              {/* Location */}
              {event.address_text && (
                <div className="bg-card rounded-2xl border border-border p-6 animate-fade-up stagger-2">
                  <h2 className="font-display text-xl font-bold mb-4">Local</h2>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      {event.venue_name && <p className="font-semibold">{event.venue_name}</p>}
                      <p className="text-muted-foreground">{event.address_text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Selection */}
            <div className="space-y-4">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-lg sticky top-24 animate-fade-up stagger-1">
                <h2 className="font-display text-xl font-bold mb-4">Ingressos</h2>

                {event.ticket_types && event.ticket_types.length > 0 ? (
                  <div className="space-y-4">
                    {event.ticket_types.map((tt: any) => {
                      const available = tt.quantity_total - tt.quantity_sold;
                      const soldOut = available <= 0;
                      const qty = selection[tt.id] || 0;

                      return (
                        <div key={tt.id} className={`p-4 rounded-xl border ${soldOut ? "opacity-50 bg-muted" : "border-border"}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{tt.name}</h3>
                              <p className="text-sm text-muted-foreground">{available} disponíveis</p>
                            </div>
                            <span className="font-bold text-lg">{formatPrice(tt.price_cents)}</span>
                          </div>

                          {!soldOut && (
                            <div className="flex items-center justify-end gap-3 mt-3">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateSelection(tt.id, -1)} disabled={qty === 0}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{qty}</span>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateSelection(tt.id, 1)} disabled={qty >= Math.min(10, available)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {soldOut && <Badge variant="destructive" className="mt-2">Esgotado</Badge>}
                        </div>
                      );
                    })}

                    {totalItems > 0 && (
                      <div className="border-t border-border pt-4 mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-muted-foreground">{totalItems} ingresso(s)</span>
                          <span className="font-display text-2xl font-bold">{formatPrice(totalCents)}</span>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={checkingOut}>
                          <Ticket className="h-5 w-5 mr-2" />
                          {checkingOut ? "Processando..." : "Comprar Ingressos"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Ingressos em breve</p>
                )}
              </div>

              {/* Organizer */}
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Organizado por</p>
                <p className="font-semibold">{event.organizer_accounts?.display_name || "Organizador"}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
