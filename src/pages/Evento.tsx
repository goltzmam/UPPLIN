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
import { FollowButton } from "@/components/events/FollowButton";
import { EventComments } from "@/components/events/EventComments";
import { EventReviews } from "@/components/events/EventReviews";
import { OrganizerPreviewTooltip } from "@/components/events/OrganizerPreviewTooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { triggerFeedback } from "@/lib/feedback";
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
        .select(`*, ticket_types(*), organizer_accounts!organizer_id(*), event_media(*)`)
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Cover / Media Carousel - Larger on desktop */}
        <div className="relative h-[40vh] md:h-[50vh] lg:h-[55vh] min-h-[300px] md:min-h-[400px] bg-secondary">
          <EventMediaCarousel
            media={event.event_media || []}
            coverImage={event.cover_image_url}
            title={event.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
        </div>

        <div className="container relative -mt-20 md:-mt-28 lg:-mt-32 z-10 pb-8 md:pb-12 lg:pb-16 px-4">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Event Info */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Main Card */}
              <div className="bg-card rounded-2xl md:rounded-3xl border border-border p-5 md:p-8 shadow-xl animate-fade-up">
                {/* Day badge */}
                <Badge className="mb-3 text-sm px-4 py-1">
                  {format(eventDate, "EEEE", { locale: ptBR })}
                </Badge>
                
                {/* Organizer @ link - More prominent on desktop with tooltip */}
                {organizer && (
                  <div className="mb-4 flex items-center gap-3">
                    <OrganizerPreviewTooltip 
                      organizerId={organizer.id}
                      organizerName={organizer.display_name}
                      organizerUsername={organizer.slug}
                    >
                      <Link 
                        to={`/organizador/${organizer.id}`}
                        className="flex items-center gap-2.5 group/org"
                      >
                        <Avatar className="h-9 w-9 md:h-11 md:w-11 ring-2 ring-border/60 group-hover/org:ring-primary transition-all shadow-sm">
                          <AvatarImage src={organizer.logo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getInitials(organizer.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm md:text-base font-semibold group-hover/org:text-primary transition-colors">
                            {organizer.display_name}
                          </span>
                          <span className="block text-xs md:text-sm text-muted-foreground group-hover/org:text-primary/70 transition-colors">
                            @{organizer.slug || organizer.display_name?.toLowerCase().replace(/\s+/g, '') || 'organizador'}
                          </span>
                        </div>
                      </Link>
                    </OrganizerPreviewTooltip>
                    <FollowButton organizerId={organizer.id} size="sm" className="ml-auto" />
                  </div>
                )}
                
                {/* Title */}
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                  {event.title}
                </h1>

                {/* Event details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold text-sm md:text-base">
                        {format(eventDate, "d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-semibold text-sm md:text-base">{format(eventDate, "HH:mm")}</p>
                    </div>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Local</p>
                        <p className="font-semibold text-sm md:text-base truncate">{event.venue_name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    className="rounded-full"
                    onClick={() => {
                      triggerFeedback({ haptic: "selection", sound: "tap" });
                      handleShare();
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                  <Button 
                    variant={isSaved ? "default" : "outline"} 
                    size="default"
                    className="rounded-full" 
                    onClick={() => {
                      triggerFeedback({ haptic: "selection", sound: "tap" });
                      handleSave();
                    }}
                    disabled={savingEvent}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
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

              {/* Organizer Section - Enhanced with tooltip */}
              {organizer && (
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 animate-fade-up stagger-3">
                  <h2 className="font-display text-lg sm:text-xl font-bold mb-5">Organizador</h2>
                  <div className="flex items-start gap-4">
                    <OrganizerPreviewTooltip 
                      organizerId={organizer.id}
                      organizerName={organizer.display_name}
                      organizerUsername={organizer.slug}
                    >
                      <Link to={`/organizador/${organizer.id}`} className="group">
                        <Avatar className="h-18 w-18 sm:h-20 sm:w-20 ring-2 ring-border/60 group-hover:ring-primary transition-all shadow-md">
                          <AvatarImage src={organizer.logo_url || undefined} />
                          <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                            {getInitials(organizer.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    </OrganizerPreviewTooltip>
                    <div className="flex-1 min-w-0">
                      <OrganizerPreviewTooltip 
                        organizerId={organizer.id}
                        organizerName={organizer.display_name}
                        organizerUsername={organizer.slug}
                      >
                        <Link to={`/organizador/${organizer.id}`} className="group inline-block">
                          <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors">{organizer.display_name}</h3>
                          <span className="text-sm text-muted-foreground group-hover:text-primary/70 transition-colors">
                            @{organizer.slug || organizer.display_name?.toLowerCase().replace(/\s+/g, '') || 'organizador'}
                          </span>
                        </Link>
                      </OrganizerPreviewTooltip>
                      {organizer.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {organizer.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-4">
                        {organizer.social_instagram && (
                          <a
                            href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl bg-muted/80 hover:bg-primary/10 flex items-center justify-center transition-all"
                          >
                            <Instagram className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                        {organizer.social_facebook && (
                          <a
                            href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl bg-muted/80 hover:bg-primary/10 flex items-center justify-center transition-all"
                          >
                            <Facebook className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                        {organizer.social_website && (
                          <a
                            href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl bg-muted/80 hover:bg-primary/10 flex items-center justify-center transition-all"
                          >
                            <Globe className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <FollowButton organizerId={organizer.id} size="sm" />
                        <Link to={`/organizador/${organizer.id}`}>
                          <Button variant="outline" size="sm" className="text-xs rounded-full">
                            <Building2 className="h-3 w-3 mr-1.5" />
                            Ver Perfil
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-4">
                <EventReviews eventId={event.id} />
              </div>

              {/* Comments Section */}
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-5">
                <EventComments eventId={event.id} />
              </div>

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
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => {
                          triggerFeedback({ haptic: "selection", sound: "tap" });
                          updateSelection(tt.id, -1);
                        }}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <span className="w-6 sm:w-8 text-center font-semibold text-sm sm:text-base">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => {
                          triggerFeedback({ haptic: "selection", sound: "tap" });
                          updateSelection(tt.id, 1);
                        }}
                        disabled={qty >= Math.min(10, available)}
                      >
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
                 <Button
                   className="w-full"
                   size="lg"
                   onClick={() => {
                     triggerFeedback({ haptic: "medium", sound: "confirm" });
                     handleCheckout();
                   }}
                   disabled={checkingOut}
                 >
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
