import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Share2, Heart, Minus, Plus, Ticket, Instagram, Facebook, Globe, Building2, Play, Pause, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/events/FollowButton";
import { EventComments } from "@/components/events/EventComments";
import { EventReviews } from "@/components/events/EventReviews";
import { WhoIsGoingSection } from "@/components/events/WhoIsGoingSection";
import { OrganizerPreviewTooltip } from "@/components/events/OrganizerPreviewTooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { triggerFeedback } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

interface TicketSelection {
  [ticketTypeId: string]: number;
}

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  sort_order: number;
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
      // Try to find by slug first, then by UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      let query = supabase
        .from("events")
        .select(`*, ticket_types(*), organizer_accounts!organizer_id(*), event_media(*)`)
        .eq("status", "published");
      
      if (isUUID) {
        query = query.eq("id", id);
      } else {
        query = query.eq("slug", id);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes - keep fresh for faster navigation
    gcTime: 1000 * 60 * 30, // 30 minutes cache
  });

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
    staleTime: 1000 * 60 * 2, // 2 minutes
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
      } catch (err) {}
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
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("event_id", id!)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Evento removido dos salvos" });
      } else {
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
            icon={<Calendar className="h-8 w-8 text-accent" />}
            title="Evento não encontrado"
            description="Este evento não existe ou não está disponível."
            variant="default"
            action={<Button onClick={() => navigate("/eventos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Ver outros eventos</Button>}
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

  const allMedia: MediaItem[] = [
    ...(event.cover_image_url ? [{ id: "cover", url: event.cover_image_url, type: "image" as const, sort_order: -1 }] : []),
    ...(event.event_media || []).sort((a: MediaItem, b: MediaItem) => a.sort_order - b.sort_order)
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 lg:pt-20">
        {/* Breadcrumb */}
        <div className="container py-3 hidden lg:block">
          <Breadcrumb 
            items={[
              { label: "Eventos", href: "/eventos" },
              { label: event.title }
            ]} 
          />
        </div>
        {/* Mobile & Tablet Layout - Normal full-width media */}
        <div className="xl:hidden">
          {/* Normal aspect ratio media for mobile */}
          {allMedia.length > 0 ? (
            <div className="relative w-full">
              <MobileMediaCarousel media={allMedia} title={event.title} />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sem mídia</p>
              </div>
            </div>
          )}
          
          <div className="px-4 py-6 space-y-6">
            <MobileEventContent />
          </div>
        </div>

        {/* Desktop: 3-column layout - Only on XL screens */}
        <div className="hidden xl:block py-8">
          <div className="max-w-[1600px] mx-auto px-6">
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* Left: Vertical Media - Feed Style (3 cols) */}
              <div className="col-span-3">
                <div className="sticky top-24">
                  <div 
                    className="rounded-3xl overflow-hidden bg-black shadow-2xl"
                    style={{ aspectRatio: "9/16", maxHeight: "calc(100vh - 120px)" }}
                  >
                    <VerticalMediaCarousel media={allMedia} title={event.title} />
                  </div>
                  {allMedia.length > 1 && (
                    <p className="text-[11px] text-muted-foreground text-center mt-3 leading-tight">
                      Deslize para ver todas as mídias
                    </p>
                  )}
                </div>
              </div>

              {/* Center: Event Info (6 cols) */}
              <div className="col-span-6 space-y-5">
                {/* Header Card */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                  {/* Organizer row */}
                  {organizer && (
                    <div className="flex items-center justify-between">
                      <OrganizerPreviewTooltip 
                        organizerId={organizer.id}
                        organizerName={organizer.display_name}
                        organizerUsername={organizer.slug}
                      >
                        <Link to={`/organizador/${organizer.id}`} className="flex items-center gap-3 group">
                          <Avatar className="h-10 w-10 ring-2 ring-border group-hover:ring-primary transition-all">
                            <AvatarImage src={organizer.logo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                              {getInitials(organizer.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {organizer.display_name}
                            </span>
                            <span className="block text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">
                              @{organizer.slug || 'organizador'}
                            </span>
                          </div>
                        </Link>
                      </OrganizerPreviewTooltip>
                      <FollowButton organizerId={organizer.id} size="sm" />
                    </div>
                  )}

                  {/* Title */}
                  <h1 className="font-display text-2xl xl:text-3xl font-bold leading-tight">{event.title}</h1>

                  {/* Date/Time/Location pills */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Data</p>
                        <p className="font-medium text-sm">{format(eventDate, "d 'de' MMMM", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Horário</p>
                        <p className="font-medium text-sm">{format(eventDate, "HH:mm")}</p>
                      </div>
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Local</p>
                          <p className="font-medium text-sm">{event.venue_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" size="sm" className="rounded-full h-9 px-4" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                    <Button 
                      variant={isSaved ? "default" : "outline"} 
                      size="sm"
                      className="rounded-full h-9 px-4" 
                      onClick={handleSave}
                      disabled={savingEvent}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="font-display text-lg font-bold mb-3">Sobre o evento</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {event.description || "Sem descrição disponível."}
                  </p>
                </div>

                {/* Location details */}
                {event.address_text && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h2 className="font-display text-lg font-bold mb-3">Local</h2>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        {event.venue_name && <p className="font-semibold text-sm">{event.venue_name}</p>}
                        <p className="text-sm text-muted-foreground">{event.address_text}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organizer details */}
                {organizer && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h2 className="font-display text-lg font-bold mb-4">Organizador</h2>
                    <div className="flex items-start gap-4">
                      <Link to={`/organizador/${organizer.id}`}>
                        <Avatar className="h-14 w-14 ring-2 ring-border hover:ring-primary transition-all">
                          <AvatarImage src={organizer.logo_url || undefined} />
                          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                            {getInitials(organizer.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/organizador/${organizer.id}`} className="hover:text-primary transition-colors">
                          <h3 className="font-semibold">{organizer.display_name}</h3>
                          <span className="text-sm text-muted-foreground">@{organizer.slug || 'organizador'}</span>
                        </Link>
                        {organizer.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{organizer.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {organizer.social_instagram && (
                            <a
                              href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all"
                            >
                              <Instagram className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                          {organizer.social_facebook && (
                            <a
                              href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all"
                            >
                              <Facebook className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                          {organizer.social_website && (
                            <a
                              href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all"
                            >
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                          <Link to={`/organizador/${organizer.id}`}>
                            <Button variant="outline" size="sm" className="text-xs rounded-full h-8 ml-1">
                              <Building2 className="h-3 w-3 mr-1.5" />
                              Ver Perfil
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Who's Going */}
                <WhoIsGoingSection eventId={event.id} />

                {/* Reviews */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <EventReviews eventId={event.id} />
                </div>

                {/* Comments */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <EventComments eventId={event.id} />
                </div>
              </div>

              {/* Right: Tickets (3 cols) */}
              <div className="col-span-3">
                <div className="sticky top-24 space-y-4">
                  <TicketSelectionCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );

  // Mobile Media Carousel - Normal aspect ratio (4:3 or video native)
  function MobileMediaCarousel({ media, title }: { media: MediaItem[]; title: string }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});

    const toggleVideoPlay = (id: string) => {
      const video = document.getElementById(`mobile-video-${id}`) as HTMLVideoElement;
      if (video) {
        if (video.paused) {
          video.play();
          setIsPlaying((prev) => ({ ...prev, [id]: true }));
        } else {
          video.pause();
          setIsPlaying((prev) => ({ ...prev, [id]: false }));
        }
      }
    };

    if (media.length === 1) {
      const item = media[0];
      return (
        <div className="w-full aspect-[4/3] bg-black">
          {item.type === "video" ? (
            <video src={item.url} className="w-full h-full object-cover" controls playsInline />
          ) : (
            <img src={item.url} alt={title} className="w-full h-full object-cover" />
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full aspect-[4/3] bg-black">
        <div className="overflow-hidden w-full h-full" ref={emblaRef}>
          <div className="flex h-full">
            {media.map((item, index) => (
              <div key={item.id} className="flex-[0_0_100%] min-w-0 h-full relative">
                {item.type === "video" ? (
                  <div className="relative w-full h-full">
                    <video
                      id={`mobile-video-${item.id}`}
                      src={item.url}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                    />
                    <button
                      onClick={() => toggleVideoPlay(item.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20"
                    >
                      <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center">
                        {isPlaying[item.id] ? (
                          <Pause className="h-6 w-6 text-foreground" />
                        ) : (
                          <Play className="h-6 w-6 text-foreground ml-0.5" />
                        )}
                      </div>
                    </button>
                  </div>
                ) : (
                  <img src={item.url} alt={`${title} - ${index + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                emblaApi?.scrollTo(index);
                setCurrentIndex(index);
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                currentIndex === index ? "w-5 bg-white" : "w-2 bg-white/50"
              )}
            />
          ))}
        </div>

        {/* Counter badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
          {currentIndex + 1}/{media.length}
        </div>
      </div>
    );
  }

  // Desktop Vertical Media Carousel - 9:16 aspect ratio
  function VerticalMediaCarousel({ media, title }: { media: MediaItem[]; title: string }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});

    const scrollPrev = useCallback(() => {
      if (emblaApi) {
        emblaApi.scrollPrev();
        setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
      }
    }, [emblaApi, media.length]);

    const scrollNext = useCallback(() => {
      if (emblaApi) {
        emblaApi.scrollNext();
        setCurrentIndex((prev) => (prev + 1) % media.length);
      }
    }, [emblaApi, media.length]);

    const toggleVideoPlay = (id: string) => {
      const video = document.getElementById(`video-${id}`) as HTMLVideoElement;
      if (video) {
        if (video.paused) {
          video.play();
          setIsPlaying((prev) => ({ ...prev, [id]: true }));
        } else {
          video.pause();
          setIsPlaying((prev) => ({ ...prev, [id]: false }));
        }
      }
    };

    if (media.length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-6">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-xs font-medium text-center">FOTO OU VÍDEO<br />DE DESTAQUE</p>
        </div>
      );
    }

    if (media.length === 1) {
      const item = media[0];
      return (
        <div className="w-full h-full">
          {item.type === "video" ? (
            <video src={item.url} className="w-full h-full object-cover" controls playsInline />
          ) : (
            <img src={item.url} alt={title} className="w-full h-full object-cover" />
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full h-full group">
        <div className="overflow-hidden w-full h-full" ref={emblaRef}>
          <div className="flex h-full">
            {media.map((item, index) => (
              <div key={item.id} className="flex-[0_0_100%] min-w-0 h-full relative">
                {item.type === "video" ? (
                  <div className="relative w-full h-full">
                    <video
                      id={`video-${item.id}`}
                      src={item.url}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                      onEnded={() => setIsPlaying((prev) => ({ ...prev, [item.id]: false }))}
                    />
                    <button
                      onClick={() => toggleVideoPlay(item.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                        {isPlaying[item.id] ? (
                          <Pause className="h-5 w-5 text-foreground" />
                        ) : (
                          <Play className="h-5 w-5 text-foreground ml-0.5" />
                        )}
                      </div>
                    </button>
                  </div>
                ) : (
                  <img src={item.url} alt={`${title} - ${index + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={scrollNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                emblaApi?.scrollTo(index);
                setCurrentIndex(index);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                currentIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
              )}
            />
          ))}
        </div>

        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-[10px] font-medium">
          {currentIndex + 1}/{media.length}
        </div>
      </div>
    );
  }

  function MobileEventContent() {
    return (
      <>
        {organizer && (
          <div className="flex items-center gap-3">
            <OrganizerPreviewTooltip 
              organizerId={organizer.id}
              organizerName={organizer.display_name}
              organizerUsername={organizer.slug}
            >
              <Link to={`/organizador/${organizer.id}`} className="flex items-center gap-2.5">
                <Avatar className="h-10 w-10 ring-2 ring-border">
                  <AvatarImage src={organizer.logo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(organizer.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-semibold">{organizer.display_name}</span>
                  <span className="block text-xs text-muted-foreground">@{organizer.slug || 'organizador'}</span>
                </div>
              </Link>
            </OrganizerPreviewTooltip>
            <FollowButton organizerId={organizer.id} size="sm" className="ml-auto" />
          </div>
        )}

        <h1 className="font-display text-2xl font-bold leading-tight">{event.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(eventDate, "d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(eventDate, "HH:mm")}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.venue_name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button 
            variant={isSaved ? "default" : "outline"} 
            size="sm"
            className="rounded-full" 
            onClick={handleSave}
            disabled={savingEvent}
          >
            <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            Salvar
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold">Sobre o evento</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description || "Sem descrição disponível."}
          </p>
        </div>

        <TicketSelectionCard />

        <div className="bg-card rounded-2xl border border-border p-4">
          <EventReviews eventId={event.id} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <EventComments eventId={event.id} />
        </div>
      </>
    );
  }

  function TicketSelectionCard() {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold mb-4">Ingressos</h2>

        {event.ticket_types && event.ticket_types.length > 0 ? (
          <div className="space-y-3">
            {event.ticket_types.map((tt: any) => {
              const available = tt.quantity_total - tt.quantity_sold;
              const soldOut = available <= 0;
              const qty = selection[tt.id] || 0;

              return (
                <div key={tt.id} className={`p-3 rounded-xl border ${soldOut ? "opacity-50 bg-muted" : "border-border"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{tt.name}</h3>
                      <p className="text-xs text-muted-foreground">{available} disponíveis</p>
                    </div>
                    <span className="font-bold text-base ml-2">{formatPrice(tt.price_cents)}</span>
                  </div>

                  {!soldOut && (
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          triggerFeedback({ haptic: "selection", sound: "tap" });
                          updateSelection(tt.id, -1);
                        }}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-semibold text-sm">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          triggerFeedback({ haptic: "selection", sound: "tap" });
                          updateSelection(tt.id, 1);
                        }}
                        disabled={qty >= Math.min(10, available)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {soldOut && <Badge variant="destructive" className="mt-2 text-xs">Esgotado</Badge>}
                </div>
              );
            })}

            {totalItems > 0 && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">{totalItems} ingresso(s)</span>
                  <span className="font-display text-xl font-bold">{formatPrice(totalCents)}</span>
                </div>
                <Button
                  className="w-full text-white"
                  size="lg"
                  onClick={() => {
                    triggerFeedback({ haptic: "medium", sound: "confirm" });
                    handleCheckout();
                  }}
                  disabled={checkingOut}
                  style={{
                    background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
                  }}
                >
                  <Ticket className="h-4 w-4 mr-2" />
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
