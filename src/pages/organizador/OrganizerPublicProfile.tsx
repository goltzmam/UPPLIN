import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Instagram, 
  Facebook, 
  Globe, 
  Building2, 
  CalendarDays, 
  Image as ImageIcon,
  Grid3X3,
  Calendar,
  MessageCircle,
  Share2,
  MapPin,
  Verified,
  ExternalLink,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton, AnimatedFollowerCount } from "@/components/events/FollowButton";
import { ShareButton } from "@/components/events/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TabType = "eventos" | "galeria" | "sobre";

export default function OrganizerPublicProfile() {
  // Support both /o/:slug and /organizador/:id (legacy)
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const identifier = slug || id;
  const [activeTab, setActiveTab] = useState<TabType>("eventos");
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch organizer data - try by slug first, then by ID
  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer-public", identifier],
    queryFn: async () => {
      // First try by slug
      const publicColumns = 'id, display_name, slug, description, logo_url, social_instagram, social_facebook, social_website, status, city, state, created_at, updated_at';
      
      let { data, error } = await supabase
        .from("organizer_accounts_public")
        .select(publicColumns)
        .eq("slug", identifier)
        .maybeSingle();

      // If not found by slug, try by ID
      if (!data && !error) {
        const result = await supabase
          .from("organizer_accounts_public")
          .select(publicColumns)
          .eq("id", identifier)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
  });

  // Fetch events using organizer ID from fetched data
  const organizerId = organizer?.id;
  
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["organizer-events-public", organizerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          slug,
          cover_image_url,
          start_at,
          end_at,
          venue_name,
          address_text,
          category,
          ticket_types(price_cents),
          event_media(id, url, type, sort_order)
        `)
        .eq("organizer_id", organizerId!)
        .eq("status", "published")
        .order("start_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
  });

  // Fetch initial follower count
  const { data: initialFollowerCount = 0 } = useQuery({
    queryKey: ["organizer-followers", organizerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId!);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizerId,
  });

  // Set initial follower count
  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount]);

  // Realtime follower subscription
  useEffect(() => {
    if (!organizerId) return;

    const channel = supabase
      .channel(`organizer-followers-${organizerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `organizer_id=eq.${organizerId}`,
        },
        () => {
          // Refetch follower count on any change
          queryClient.invalidateQueries({ queryKey: ["organizer-followers", organizerId] });
          queryClient.invalidateQueries({ queryKey: ["follower-count", organizerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizerId, queryClient]);

  // Get all gallery images from events
  const galleryImages = events.flatMap((event: any) => {
    const images: { url: string; eventTitle: string; eventId: string; type: string }[] = [];
    
    // Add cover image
    if (event.cover_image_url) {
      images.push({
        url: event.cover_image_url,
        eventTitle: event.title,
        eventId: event.id,
        type: "image",
      });
    }
    
    // Add event media
    event.event_media?.forEach((media: any) => {
      images.push({
        url: media.url,
        eventTitle: event.title,
        eventId: event.id,
        type: media.type,
      });
    });
    
    return images;
  });

  const eventCount = events.length;
  const photoCount = galleryImages.length;

  if (isLoading) return <><Header /><PageLoading /><Footer /></>;

  if (!organizer) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <EmptyState
            icon={<Building2 className="h-8 w-8 text-accent" />}
            title="Organizador não encontrado"
            description="Este organizador não existe ou não está disponível."
            variant="default"
            action={<Button asChild><Link to="/eventos">Ver eventos</Link></Button>}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "O";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const memberSince = organizer.created_at 
    ? format(new Date(organizer.created_at), "MMM yyyy", { locale: ptBR })
    : null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "eventos", label: "Eventos", icon: <Grid3X3 className="h-4 w-4" />, count: eventCount },
    { id: "galeria", label: "Galeria", icon: <ImageIcon className="h-4 w-4" />, count: photoCount },
    { id: "sobre", label: "Sobre", icon: <MessageCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 bg-background">
      <Header />

      <main className="flex-1 pt-14">
        {/* Hero Cover Section */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-accent/30 via-primary/20 to-pink-500/30 overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--accent)) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, hsl(var(--primary)) 0%, transparent 50%)`,
            }} />
          </div>
          
          {/* Recent event images as collage */}
          {galleryImages.length > 0 && (
            <div className="absolute inset-0 flex opacity-30">
              {galleryImages.slice(0, 4).map((img, i) => (
                <div key={i} className="flex-1 overflow-hidden">
                  <img 
                    src={img.url} 
                    alt="" 
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Profile Info Section */}
        <div className="container relative -mt-20 z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-background shadow-2xl border-4 border-background">
                <AvatarImage src={organizer.logo_url || undefined} className="object-cover" />
                <AvatarFallback className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-accent to-pink-500 text-white">
                  {getInitials(organizer.display_name)}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Info & Actions */}
            <div className="flex-1 pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  {/* Name with verified badge */}
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl md:text-3xl font-bold">
                      {organizer.display_name}
                    </h1>
                    {eventCount >= 5 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <Verified className="h-6 w-6 text-accent fill-accent/20" />
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Handle */}
                  <p className="text-muted-foreground">
                    @{organizer.slug || organizer.display_name?.toLowerCase().replace(/\s+/g, '') || 'organizador'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <FollowButton 
                    organizerId={organizerId!} 
                    variant="premium"
                    onFollowerCountChange={setFollowerCount}
                  />
                  <ShareButton 
                    eventId={organizerId!}
                    eventTitle={organizer.display_name}
                    className="h-11 px-4 rounded-full border border-border bg-background hover:bg-muted"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex items-center gap-8 py-4 border-b border-border"
          >
            <button className="text-center group">
              <span className="font-bold text-xl block">{eventCount}</span>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">eventos</span>
            </button>
            <button className="text-center group">
              <AnimatedFollowerCount count={followerCount} className="text-xl block" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">seguidores</span>
            </button>
            <button className="text-center group">
              <span className="font-bold text-xl block">{photoCount}</span>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">fotos</span>
            </button>
            {memberSince && (
              <div className="hidden md:block text-center ml-auto">
                <span className="text-sm text-muted-foreground">Desde {memberSince}</span>
              </div>
            )}
          </motion.div>

          {/* Bio */}
          {organizer.description && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-muted-foreground max-w-2xl"
            >
              {organizer.description}
            </motion.p>
          )}

          {/* Social Links */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mt-4"
          >
            {organizer.social_instagram && (
              <a
                href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                <span className="text-muted-foreground">Instagram</span>
              </a>
            )}
            {organizer.social_facebook && (
              <a
                href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors"
              >
                <Facebook className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Facebook</span>
              </a>
            )}
            {organizer.social_website && (
              <a
                href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="text-muted-foreground">Website</span>
              </a>
            )}
          </motion.div>

          {/* Tabs */}
          <div className="mt-6 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  )}
                  
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container py-6">
          <AnimatePresence mode="wait">
            {activeTab === "eventos" && (
              <motion.div
                key="eventos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {loadingEvents ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-[3/4] rounded-xl animate-pulse bg-muted" />
                    ))}
                  </div>
                ) : events.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {events.map((event: any, index: number) => {
                      const minPrice = event.ticket_types?.length
                        ? Math.min(...event.ticket_types.map((t: any) => t.price_cents || 0))
                        : 0;
                      const isPast = new Date(event.end_at || event.start_at) < new Date();

                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link
                            to={`/evento/${event.slug || event.id}`}
                            className="group relative aspect-[3/4] rounded-xl overflow-hidden block bg-muted"
                          >
                            {/* Image */}
                            <img
                              src={event.cover_image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80"}
                              alt={event.title}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                            {/* Past event overlay */}
                            {isPast && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white/80 text-sm font-medium px-3 py-1 rounded-full bg-black/50">
                                  Encerrado
                                </span>
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-3">
                              <p className="text-white font-semibold text-sm line-clamp-2 mb-1">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-1 text-white/70 text-xs">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(event.start_at), "d MMM", { locale: ptBR })}
                                </span>
                              </div>
                              {minPrice > 0 && (
                                <div className="mt-1 text-xs text-accent font-semibold">
                                  R$ {(minPrice / 100).toFixed(0)}
                                </div>
                              )}
                            </div>

                            {/* Category badge */}
                            {event.category && (
                              <div className="absolute top-2 left-2">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/50 text-white/90 backdrop-blur-sm">
                                  {event.category}
                                </span>
                              </div>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CalendarDays className="h-8 w-8 text-accent" />}
                    title="Nenhum evento"
                    description="Este organizador ainda não publicou eventos."
                    variant="default"
                  />
                )}
              </motion.div>
            )}

            {activeTab === "galeria" && (
              <motion.div
                key="galeria"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {galleryImages.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2">
                      {galleryImages.map((image, index) => (
                        <motion.button
                          key={`${image.eventId}-${index}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => setSelectedImage(image.url)}
                          className="relative aspect-square overflow-hidden rounded-md group"
                        >
                          <img
                            src={image.url}
                            alt={image.eventTitle}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            {image.type === "video" ? (
                              <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Lightbox */}
                    <AnimatePresence>
                      {selectedImage && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                          onClick={() => setSelectedImage(null)}
                        >
                          <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={selectedImage}
                            alt=""
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                          />
                          <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                          >
                            ✕
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <EmptyState
                    icon={<ImageIcon className="h-8 w-8 text-accent" />}
                    title="Nenhuma foto"
                    description="Ainda não há fotos de eventos."
                    variant="default"
                  />
                )}
              </motion.div>
            )}

            {activeTab === "sobre" && (
              <motion.div
                key="sobre"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl"
              >
                <div className="space-y-6">
                  {/* About section */}
                  <div className="bg-muted/30 rounded-xl p-6">
                    <h3 className="font-semibold text-lg mb-3">Sobre {organizer.display_name}</h3>
                    <p className="text-muted-foreground">
                      {organizer.description || "Este organizador ainda não adicionou uma descrição."}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-accent/10 to-transparent rounded-xl p-4 border border-accent/20">
                      <CalendarDays className="h-6 w-6 text-accent mb-2" />
                      <span className="text-2xl font-bold block">{eventCount}</span>
                      <span className="text-sm text-muted-foreground">Eventos realizados</span>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500/10 to-transparent rounded-xl p-4 border border-pink-500/20">
                      <ImageIcon className="h-6 w-6 text-pink-500 mb-2" />
                      <span className="text-2xl font-bold block">{photoCount}</span>
                      <span className="text-sm text-muted-foreground">Fotos compartilhadas</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-muted/30 rounded-xl p-6">
                    <h3 className="font-semibold text-lg mb-4">Informações de contato</h3>
                    <div className="space-y-3">
                      {organizer.email && (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <a href={`mailto:${organizer.email}`} className="font-medium hover:text-accent transition-colors">
                              {organizer.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {organizer.phone && (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <a href={`tel:${organizer.phone}`} className="font-medium hover:text-accent transition-colors">
                              {organizer.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {memberSince && (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Membro desde</p>
                            <p className="font-medium">{format(new Date(organizer.created_at!), "MMMM 'de' yyyy", { locale: ptBR })}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External links */}
                  {(organizer.social_instagram || organizer.social_facebook || organizer.social_website) && (
                    <div className="bg-muted/30 rounded-xl p-6">
                      <h3 className="font-semibold text-lg mb-4">Links externos</h3>
                      <div className="flex flex-wrap gap-2">
                        {organizer.social_instagram && (
                          <a
                            href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            <Instagram className="h-4 w-4" />
                            Instagram
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {organizer.social_facebook && (
                          <a
                            href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            <Facebook className="h-4 w-4" />
                            Facebook
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {organizer.social_website && (
                          <a
                            href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground text-sm font-medium hover:bg-muted-foreground/20 transition-colors"
                          >
                            <Globe className="h-4 w-4" />
                            Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
