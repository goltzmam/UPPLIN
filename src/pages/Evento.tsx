import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Share2, Heart, Minus, Plus, Ticket, Instagram, Facebook, Globe, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { EventMediaCarousel } from "@/components/events/EventMediaCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<TicketSelection>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(*), organizer_accounts(*), event_media(*)`)
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check if event is saved
  const { data: isSaved } = useQuery({
    queryKey: ["saved-event", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select("id")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!id && !!user,
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

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Confira este evento: ${event?.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title, text, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Faça login para salvar", description: "Você precisa estar logado para salvar eventos." });
      navigate("/login");
      return;
    }

    setSavingEvent(true);

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("event_id", id!)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Evento removido dos salvos" });
      } else {
        // Add to saved
        const { error } = await supabase
          .from("saved_events")
          .insert({ event_id: id, user_id: user.id });

        if (error) throw error;
        toast({ title: "Evento salvo!", description: "Veja seus eventos salvos no perfil." });
      }

      queryClient.invalidateQueries({ queryKey: ["saved-event", id, user.id] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingEvent(false);
    }
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
  const organizer = event.organizer_accounts;

  const getInitials = (name: string | null) => {
    if (!name) return "O";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Cover / Media Carousel */}
        <div className="relative h-[35vh] sm:h-[45vh] min-h-[280px] sm:min-h-[350px] bg-secondary">
          <EventMediaCarousel
            media={event.event_media || []}
            coverImage={event.cover_image_url}
            title={event.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="container relative -mt-16 sm:-mt-24 z-10 pb-8 sm:pb-12 px-4">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Event Info */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-lg animate-fade-up">
                <Badge className="mb-3 sm:mb-4">{format(eventDate, "EEEE", { locale: ptBR })}</Badge>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{event.title}</h1>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-muted-foreground mb-4 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    <span className="text-sm sm:text-base">{format(eventDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    <span className="text-sm sm:text-base">{format(eventDate, "HH:mm")}</span>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                      <span className="text-sm sm:text-base truncate">{event.venue_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={handleShare}>
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Compartilhar
                  </Button>
                  <Button 
                    variant={isSaved ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs sm:text-sm" 
                    onClick={handleSave}
                    disabled={savingEvent}
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isSaved ? "fill-current" : ""}`} />
                    {isSaved ? "Salvo" : "Salvar"}
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-1">
                <h2 className="font-display text-lg sm:text-xl font-bold mb-3 sm:mb-4">Sobre o evento</h2>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">{event.description || "Sem descrição disponível."}</p>
              </div>

              {/* Location */}
              {event.address_text && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-2">
                  <h2 className="font-display text-lg sm:text-xl font-bold mb-3 sm:mb-4">Local</h2>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      {event.venue_name && <p className="font-semibold text-sm sm:text-base">{event.venue_name}</p>}
                      <p className="text-sm sm:text-base text-muted-foreground">{event.address_text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Organizer Section */}
              {organizer && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-3">
                  <h2 className="font-display text-lg sm:text-xl font-bold mb-4">Organizador</h2>
                  <div className="flex items-start gap-4">
                    <Link to={`/organizador/${organizer.id}`}>
                      <Avatar className="h-16 w-16 ring-2 ring-border">
                        <AvatarImage src={organizer.logo_url || undefined} />
                        <AvatarFallback className="text-lg font-bold">
                          {getInitials(organizer.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/organizador/${organizer.id}`} className="hover:underline">
                        <h3 className="font-semibold text-base sm:text-lg">{organizer.display_name}</h3>
                      </Link>
                      {organizer.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {organizer.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        {organizer.social_instagram && (
                          <a
                            href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                        {organizer.social_facebook && (
                          <a
                            href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                        {organizer.social_website && (
                          <a
                            href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        <Link to={`/organizador/${organizer.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            Ver Perfil
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Selection - Mobile Only */}
              <div className="lg:hidden">
                <TicketSelectionCard />
              </div>
            </div>

            {/* Ticket Selection - Desktop */}
            <div className="hidden lg:block space-y-4">
              <TicketSelectionCard />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );

  function TicketSelectionCard() {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-lg lg:sticky lg:top-24 animate-fade-up stagger-1">
        <h2 className="font-display text-lg sm:text-xl font-bold mb-4">Ingressos</h2>

        {event.ticket_types && event.ticket_types.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {event.ticket_types.map((tt: any) => {
              const available = tt.quantity_total - tt.quantity_sold;
              const soldOut = available <= 0;
              const qty = selection[tt.id] || 0;

              return (
                <div key={tt.id} className={`p-3 sm:p-4 rounded-xl border ${soldOut ? "opacity-50 bg-muted" : "border-border"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{tt.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{available} disponíveis</p>
                    </div>
                    <span className="font-bold text-base sm:text-lg ml-2">{formatPrice(tt.price_cents)}</span>
                  </div>

                  {!soldOut && (
                    <div className="flex items-center justify-end gap-2 sm:gap-3 mt-3">
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => updateSelection(tt.id, -1)} disabled={qty === 0}>
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <span className="w-6 sm:w-8 text-center font-semibold text-sm sm:text-base">{qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => updateSelection(tt.id, 1)} disabled={qty >= Math.min(10, available)}>
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  )}
                  {soldOut && <Badge variant="destructive" className="mt-2 text-xs">Esgotado</Badge>}
                </div>
              );
            })}

            {totalItems > 0 && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">{totalItems} ingresso(s)</span>
                  <span className="font-display text-xl sm:text-2xl font-bold">{formatPrice(totalCents)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={checkingOut}>
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {checkingOut ? "Processando..." : "Comprar Ingressos"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Ingressos em breve</p>
        )}
      </div>
    );
  }
}
