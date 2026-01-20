import React, { useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { TikTokFeed } from "@/components/feed/TikTokFeed";
import { FeedSearch } from "@/components/feed/FeedSearch";

import { CategoriesCarousel } from "@/components/home/CategoriesCarousel";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { NearbyEvents } from "@/components/home/NearbyEvents";
import { EventGridCard } from "@/components/home/EventGridCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { 
  Search, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Flame,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function Index() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Keep scroll position without re-rendering on every scroll tick (critical for mobile perf)
  const scrollPosRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Desktop + Mobile: Fetch events for feed/grid display
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

  // Flatten all pages into one array (for desktop grid)
  const events = data?.pages.flatMap(page => page.data) || [];

  // Transform events for feed/grid
  const DEMO_VIDEO_URLS = [
    // Vertical demo videos (DEV only)
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/bee.mp4",
  ];

  const DEMO_COVER_URLS = [
    "https://images.unsplash.com/photo-1521337706264-a414f153a5fc?w=1200&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
  ];

  const feedItems = events.map((event: any, index: number) => {
    const videoMedia = event.event_media?.find((m: any) => m.type === "video");
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;

    const demoVideo = import.meta.env.DEV ? DEMO_VIDEO_URLS[index % DEMO_VIDEO_URLS.length] : null;
    const demoCover = import.meta.env.DEV ? DEMO_COVER_URLS[index % DEMO_COVER_URLS.length] : null;

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

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await queryClient.removeQueries({ queryKey: ["homepage-events-infinite"] });
    await queryClient.invalidateQueries({ queryKey: ["featured-events"] });
    await new Promise((resolve) => setTimeout(resolve, 500));
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

  // Handle swipe gestures for tab switching
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      // Swiped right -> go to Following
      setActiveTab("following");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      // Swiped left -> go to For You
      setActiveTab("foryou");
    }
  }, []);

  // =====================================================================
  // MOBILE: Fullscreen TikTok-style feed with overlay header/tabs
  // =====================================================================
  const MobileFeed = () => (
    <div className="fixed inset-0 z-0 md:hidden">
      {/* Fullscreen Feed with swipe gesture */}
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

      {/* Overlay Header - TikTok style */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        {/* Safe area for notch */}
        <div className="h-[env(safe-area-inset-top,0px)]" />
        
        {/* Top bar with logo and tabs */}
        <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
          <Link to="/" className="font-display text-xl font-bold text-white drop-shadow-lg">
            UPPLIN
          </Link>
          
          {/* Center tabs with animated underline */}
          <div className="relative flex items-center gap-6">
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "relative text-sm font-semibold transition-all pb-1",
                activeTab === "following" 
                  ? "text-white" 
                  : "text-white/60"
              )}
            >
              Seguindo
            </button>
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn(
                "relative text-sm font-semibold transition-all pb-1",
                activeTab === "foryou" 
                  ? "text-white" 
                  : "text-white/60"
              )}
            >
              Para você
            </button>
            
            {/* Animated underline indicator */}
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

          {/* Search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10"
          >
            <Search className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Search Overlay */}
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );

  // =====================================================================
  // DESKTOP: Modern layout with polished sections - Matching mobile quality
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden md:block min-h-screen bg-background">
      <Header />

      {/* Search Bar - Fixed below header with refined styling */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="container py-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); navigate("/eventos"); }} 
            className="flex items-center gap-4 max-w-3xl mx-auto"
          >
            <div className="flex-1 flex items-center gap-3 bg-muted/60 hover:bg-muted/80 rounded-2xl px-6 py-3.5 transition-all duration-200 group border border-transparent hover:border-border/50 hover:shadow-sm">
              <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <input
                type="text"
                placeholder="Buscar eventos, artistas, locais..."
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
                onFocus={() => navigate("/eventos")}
              />
            </div>
          </form>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-[calc(3.5rem+5rem)]">

          {/* Categories - Enhanced for desktop */}
          <ScrollReveal variant="fadeUp" delay={0.1}>
            <section className="border-b border-border/30 bg-background">
              <div className="container">
                <CategoriesCarousel />
              </div>
            </section>
          </ScrollReveal>

          {/* Nearby Events - Geolocation */}
          <ScrollReveal variant="fadeUp" delay={0.15}>
            <NearbyEvents limit={4} />
          </ScrollReveal>

          {/* Trending Section - Premium Design with Scroll Reveal */}
          <ScrollReveal variant="fadeUp" delay={0.2}>
            <section className="py-10 lg:py-12 border-b border-border/30">
              <div className="container">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-destructive flex items-center justify-center shadow-lg shadow-accent/20">
                      <Flame className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl lg:text-3xl font-bold">Em Alta</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Os mais buscados da semana</p>
                    </div>
                  </div>
                  <Link 
                    to="/eventos" 
                    className="hidden sm:flex px-5 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground items-center gap-2 transition-all group"
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                
                {/* Trending cards - Premium layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {trending.map((item, idx) => (
                    <ScrollReveal key={item.title} variant="scale" delay={0.1 * idx}>
                      <Link 
                        to={item.href} 
                        className="group relative rounded-3xl overflow-hidden aspect-[2.2/1] bg-muted shadow-lg hover:shadow-2xl transition-all duration-500 block"
                      >
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                        <div className="absolute inset-0 p-8 flex flex-col justify-center">
                          <div className="flex items-center gap-2 text-white/80 text-xs mb-3">
                            <TrendingUp className="h-4 w-4" />
                            <span className="uppercase tracking-widest font-semibold">{item.subtitle}</span>
                          </div>
                          <h3 className="font-display text-3xl lg:text-4xl font-bold text-white group-hover:translate-x-1 transition-transform duration-300">
                            {item.title}
                          </h3>
                          <div className="mt-4 flex items-center gap-2 text-white/60 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span>Explorar categoria</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Main Feed Section with Tabs */}
          <section className="py-10 lg:py-14">
            <div className="container">
              {/* Section header */}
              <ScrollReveal variant="fadeUp">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shadow-lg">
                      <Calendar className="h-6 w-6 text-background" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl lg:text-3xl font-bold">Eventos</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Descubra o que está rolando</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Tab Navigation - Premium pill design */}
              <div className="sticky top-[136px] z-30 mb-8 py-3 -mx-4 px-4 bg-background/95 backdrop-blur-xl">
                <div className="flex items-center gap-1.5 p-1.5 bg-muted/70 backdrop-blur-xl rounded-2xl w-fit shadow-sm border border-border/50">
                  <button
                    onClick={() => setActiveTab("foryou")}
                    className={cn(
                      "px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-300",
                      activeTab === "foryou" 
                        ? "bg-foreground text-background shadow-lg" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    Para Você
                  </button>
                  <button
                    onClick={() => setActiveTab("following")}
                    className={cn(
                      "px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-300",
                      activeTab === "following" 
                        ? "bg-foreground text-background shadow-lg" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    Seguindo
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {activeTab === "foryou" ? (
                  <motion.div
                    key="foryou-desktop"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {isLoading ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 lg:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                          <div key={i} className="aspect-[3/4] rounded-3xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 lg:gap-6">
                        {feedItems.map((item, index) => (
                          <EventGridCard
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            coverImageUrl={item.coverImageUrl}
                            startAt={item.startAt}
                            venueName={item.venueName}
                            organizerName={item.organizerName}
                            organizerAvatar={item.organizerAvatar}
                            organizerSlug={item.organizerSlug}
                            organizerId={item.organizerId}
                            minPrice={item.minPrice}
                            index={index}
                          />
                        ))}
                      </div>
                    )}

                    {/* Load more button - Premium styling */}
                    <div className="flex justify-center mt-14 pb-10">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="rounded-full px-10 py-6 text-base font-semibold hover:bg-foreground hover:text-background transition-all duration-300 border-2" 
                        asChild
                      >
                        <Link to="/eventos">
                          Ver mais eventos
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="following-desktop"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="min-h-[50vh]"
                  >
                    <FollowingFeed />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>
      </PullToRefresh>

      <Footer />
    </div>
  );

  return (
    <>
      {/* Mobile: Fullscreen TikTok feed */}
      <MobileFeed />
      
      {/* Desktop: Traditional layout */}
      <DesktopLayout />
      
      {/* Bottom Nav - always visible on mobile */}
      <BottomNav />
    </>
  );
}
