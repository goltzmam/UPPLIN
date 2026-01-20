import React, { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { TikTokFeed } from "@/components/feed/TikTokFeed";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { 
  Search, 
  ArrowRight,
  Flame,
  Calendar,
  MapPin,
  Sparkles,
  Users,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const categories = [
  { name: "Festas", icon: "🎉", href: "/eventos?categoria=festas" },
  { name: "Shows", icon: "🎤", href: "/eventos?categoria=shows" },
  { name: "Festivais", icon: "🎪", href: "/eventos?categoria=festivais" },
  { name: "Esportes", icon: "⚽", href: "/eventos?categoria=esportes" },
  { name: "Teatro", icon: "🎭", href: "/eventos?categoria=teatro" },
  { name: "Workshops", icon: "💡", href: "/eventos?categoria=workshops" },
  { name: "Gastronomia", icon: "🍽️", href: "/eventos?categoria=gastronomia" },
  { name: "Arte", icon: "🎨", href: "/eventos?categoria=arte" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrollPosRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["homepage-events-infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from("events")
        .select(`
          *,
          organizer:organizer_id(id, display_name, logo_url, slug),
          event_media(id, url, type, sort_order),
          ticket_types(price_cents)
        `, { count: "exact" })
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .range(from, to);
      
      if (error) throw error;
      return { 
        data: data || [], 
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count || 0
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const events = data?.pages.flatMap(page => page.data) || [];

  // Demo assets - using reliable CDN sources
  const DEMO_VIDEO_URL = "/videos/demo-carnaval.mp4";
  
  const DEMO_COVER_URLS = [
    "https://images.unsplash.com/photo-1521337706264-a414f153a5fc?w=1200&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80",
  ];

  const feedItems = events.map((event: any, index: number) => {
    const videoMedia = event.event_media?.find((m: any) => m.type === "video");
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;

    // Use actual video from event_media, or demo video for first item in dev
    const demoCover = import.meta.env.DEV ? DEMO_COVER_URLS[index % DEMO_COVER_URLS.length] : null;
    // Use the demo video for the first event to showcase the feature
    const demoVideo = import.meta.env.DEV && index === 0 ? DEMO_VIDEO_URL : null;

    return {
      id: event.id,
      title: event.title,
      coverImageUrl: event.cover_image_url || demoCover,
      videoUrl: videoMedia?.url || demoVideo,
      startAt: event.start_at,
      endAt: event.end_at,
      venueName: event.venue_name,
      addressText: event.address_text,
      organizerName: event.organizer?.display_name,
      organizerSlug: event.organizer?.slug,
      organizerAvatar: event.organizer?.logo_url,
      organizerId: event.organizer_id,
      minPrice,
    };
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.removeQueries({ queryKey: ["homepage-events-infinite"] });
    await new Promise((resolve) => setTimeout(resolve, 400));
  }, [queryClient]);

  const trending = [
    { 
      title: "Festivais de Verão", 
      subtitle: "Em alta agora", 
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
      href: "/eventos?categoria=festivais"
    },
    { 
      title: "Shows Internacionais", 
      subtitle: "Mais buscados", 
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
      href: "/eventos?categoria=shows"
    },
  ];

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setActiveTab("following");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setActiveTab("foryou");
    }
  }, []);

  // =====================================================================
  // MOBILE: Fullscreen TikTok-style feed
  // =====================================================================
  const MobileFeed = () => (
    <div className="fixed inset-0 z-0 md:hidden">
      <motion.div 
        className="absolute inset-0"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "foryou" ? (
            <motion.div
              key="foryou-mobile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
              style={{ "--app-bottom-offset": "calc(72px + env(safe-area-inset-bottom, 0px))" } as React.CSSProperties}
            >
              <TikTokFeed
                items={feedItems}
                isLoading={isLoading}
                onLoadMore={fetchNextPage}
                hasMore={!!hasNextPage}
                isLoadingMore={isFetchingNextPage}
                scrollPosition={scrollPosRef.current}
                onScrollChange={(pos) => {
                  scrollPosRef.current = pos;
                }}
                onRefresh={handleRefresh}
              />
            </motion.div>
          ) : (
            <motion.div
              key="following-mobile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full bg-black overflow-y-auto pb-20"
            >
              <div className="pt-24">
                <FollowingFeed />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Overlay Header */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="h-[env(safe-area-inset-top,0px)]" />
        
        <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
          <Link to="/" className="font-display text-xl font-bold text-white drop-shadow-lg">
            UPPLIN
          </Link>
          
          <div className="relative flex items-center gap-6">
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "relative text-sm font-semibold transition-all pb-1",
                activeTab === "following" ? "text-white" : "text-white/60"
              )}
            >
              Seguindo
            </button>
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn(
                "relative text-sm font-semibold transition-all pb-1",
                activeTab === "foryou" ? "text-white" : "text-white/60"
              )}
            >
              Para você
            </button>
            
            <motion.div
              layoutId="tab-underline-mobile"
              className="absolute bottom-0 h-0.5 bg-white rounded-full"
              style={{
                left: activeTab === "following" ? "0px" : "calc(50% + 12px)",
                width: activeTab === "following" ? "54px" : "62px",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10"
          >
            <Search className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );

  // =====================================================================
  // DESKTOP/TABLET: Social-style vertical feed with sidebar
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden md:flex min-h-screen bg-background">
      {/* Left Sidebar - Categories & Trending */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 border-r border-border/50 h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 pt-20">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-bold mb-8 block">
            UPPLIN
          </Link>

          {/* Tab Navigation */}
          <div className="space-y-1 mb-8">
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                activeTab === "foryou"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Sparkles className="h-5 w-5" />
              Para Você
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                activeTab === "following"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              Seguindo
            </button>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Categorias
            </h3>
            <div className="space-y-1">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Em Alta
            </h3>
            <div className="space-y-3">
              {trending.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group block rounded-xl overflow-hidden"
                >
                  <div className="relative aspect-[2/1] bg-muted">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-1.5 text-white/70 text-[10px] mb-0.5">
                        <Flame className="h-3 w-3 text-accent" />
                        <span className="uppercase tracking-wide">{item.subtitle}</span>
                      </div>
                      <p className="text-white text-sm font-semibold">{item.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Vertical Feed */}
      <main className="flex-1 max-w-2xl mx-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile/Tablet Logo */}
            <Link to="/" className="font-display text-xl font-bold lg:hidden">
              UPPLIN
            </Link>

            {/* Centered Tabs (mobile/tablet) */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl lg:mx-auto">
              <button
                onClick={() => setActiveTab("foryou")}
                className={cn(
                  "px-5 py-2 text-sm font-medium rounded-lg transition-all",
                  activeTab === "foryou"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Para Você
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={cn(
                  "px-5 py-2 text-sm font-medium rounded-lg transition-all",
                  activeTab === "following"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Seguindo
              </button>
            </div>

            {/* Search Button */}
            <button
              onClick={() => navigate("/eventos")}
              className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Feed Content */}
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="pb-20">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "foryou" ? (
                <motion.div
                  key="foryou-desktop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y divide-border/30"
                >
                  {isLoading ? (
                    <div className="space-y-4 p-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {feedItems.map((item, index) => (
                        <DesktopFeedCard key={item.id} item={item} index={index} />
                      ))}
                    </>
                  )}

                  {hasNextPage && (
                    <div className="flex justify-center py-8">
                      <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="rounded-full px-8"
                      >
                        {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="following-desktop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="min-h-[50vh] p-4"
                >
                  <FollowingFeed />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PullToRefresh>
      </main>

      {/* Right Sidebar - Search & Suggestions (XL screens) */}
      <aside className="hidden xl:block w-80 shrink-0 border-l border-border/50 h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 pt-6">
          {/* Search */}
          <button
            onClick={() => navigate("/eventos")}
            className="w-full flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3 text-muted-foreground hover:bg-muted transition-colors mb-6"
          >
            <Search className="h-5 w-5" />
            <span className="text-sm">Buscar eventos...</span>
          </button>

          {/* CTA */}
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-2xl p-5 mb-6 border border-primary/20">
            <h3 className="font-display font-bold mb-2">Crie seu evento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece a vender ingressos hoje mesmo
            </p>
            <Button asChild size="sm" className="w-full rounded-full">
              <Link to="/organizador/cadastro">
                Começar grátis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Quick Categories */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Explorar
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-muted/80 transition-colors"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  // Desktop Feed Card Component
  const DesktopFeedCard = ({ item, index }: { item: typeof feedItems[0]; index: number }) => {
    const eventDate = new Date(item.startAt);
    const formattedDate = format(eventDate, "d 'de' MMMM", { locale: ptBR });
    const formattedTime = format(eventDate, "HH:mm");
    const formatPrice = (cents: number) => cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Play video on hover
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !item.videoUrl) return;
      
      if (isHovered && videoLoaded) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }, [isHovered, videoLoaded, item.videoUrl]);

    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="p-4"
      >
        {/* Organizer Header */}
        <div className="flex items-center gap-3 mb-3">
          <Link
            to={`/organizador/${item.organizerId}`}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden ring-2 ring-border group-hover:ring-primary transition-colors">
              {item.organizerAvatar ? (
                <img
                  src={item.organizerAvatar}
                  alt={item.organizerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
            <div>
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                {item.organizerName}
              </span>
              <span className="block text-xs text-muted-foreground">
                @{item.organizerSlug || item.organizerName?.replace(/\s+/g, "").toLowerCase()}
              </span>
            </div>
          </Link>
        </div>

        {/* Media Container */}
        <Link
          to={`/evento/${item.id}`}
          className="block relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted mb-3 group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Cover Image */}
          {item.coverImageUrl && (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-500",
                isHovered && item.videoUrl && videoLoaded ? "opacity-0" : "opacity-100 group-hover:scale-105"
              )}
              loading="lazy"
            />
          )}

          {/* Video (plays on hover) */}
          {item.videoUrl && (
            <video
              ref={videoRef}
              src={item.videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              onLoadedData={() => setVideoLoaded(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                isHovered && videoLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold text-white">{formattedDate}</span>
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-md border",
              (item.minPrice || 0) === 0
                ? "bg-success/30 border-success/40 text-success"
                : "bg-black/60 border-white/10 text-white"
            )}>
              <span className="text-xs font-bold">{formatPrice(item.minPrice || 0)}</span>
            </div>
          </div>

          {/* Video Play Indicator */}
          {item.videoUrl && (
            <div className={cn(
              "absolute bottom-3 right-3 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 transition-opacity",
              isHovered ? "opacity-0" : "opacity-100"
            )}>
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          )}
        </Link>

        {/* Event Info */}
        <Link to={`/evento/${item.id}`} className="block group">
          <h3 className="font-display text-lg font-bold leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formattedDate} • {formattedTime}
            </span>
            {item.venueName && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                {item.venueName}
              </span>
            )}
          </div>
        </Link>
      </motion.article>
    );
  };

  return (
    <>
      <MobileFeed />
      <DesktopLayout />
      <BottomNav />
    </>
  );
}
