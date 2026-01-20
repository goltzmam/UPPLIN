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
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { EventGridCard } from "@/components/home/EventGridCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { 
  Search, 
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Flame,
  Calendar,
  MapPin,
  Sparkles,
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

  const DEMO_VIDEO_URLS = [
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
  // DESKTOP: Clean grid layout without stories
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden md:block min-h-screen bg-background">
      <Header />

      {/* Hero Search Section */}
      <section className="pt-20 pb-8 bg-gradient-to-b from-muted/50 to-background">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-3">
              Descubra eventos incríveis
            </h1>
            <p className="text-muted-foreground">
              Shows, festas, festivais e muito mais perto de você
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => navigate("/eventos")}
              className="w-full flex items-center gap-3 bg-background border border-border rounded-2xl px-5 py-4 hover:border-accent/50 hover:shadow-lg transition-all group"
            >
              <Search className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              <span className="text-muted-foreground text-left flex-1">Buscar eventos, artistas, locais...</span>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60">
                <kbd className="px-2 py-1 bg-muted rounded text-[10px]">⌘</kbd>
                <kbd className="px-2 py-1 bg-muted rounded text-[10px]">K</kbd>
              </div>
            </button>
          </div>

          {/* Categories Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-3xl mx-auto">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.href}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full hover:border-accent/50 hover:bg-accent/5 transition-all text-sm"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PullToRefresh onRefresh={handleRefresh}>
        <main>
          {/* Trending Section */}
          <ScrollReveal variant="fadeUp" delay={0.1}>
            <section className="py-10 border-b border-border/30">
              <div className="container">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Flame className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl lg:text-2xl font-bold">Em Alta</h2>
                      <p className="text-xs text-muted-foreground">Os mais buscados</p>
                    </div>
                  </div>
                  <Link 
                    to="/eventos" 
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {trending.map((item, idx) => (
                    <Link 
                      key={item.title}
                      to={item.href} 
                      className="group relative rounded-2xl overflow-hidden aspect-[2.5/1] bg-muted"
                    >
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="uppercase tracking-wider font-medium">{item.subtitle}</span>
                        </div>
                        <h3 className="font-display text-2xl lg:text-3xl font-bold text-white">
                          {item.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Main Feed Section */}
          <section className="py-10">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-background" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl lg:text-2xl font-bold">Eventos</h2>
                    <p className="text-xs text-muted-foreground">Descubra o que está rolando</p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="sticky top-14 z-30 mb-6 py-3 -mx-4 px-4 bg-background/95 backdrop-blur-xl border-b border-border/30">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab("foryou")}
                    className={cn(
                      "px-6 py-2.5 text-sm font-medium rounded-lg transition-all",
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
                      "px-6 py-2.5 text-sm font-medium rounded-lg transition-all",
                      activeTab === "following" 
                        ? "bg-foreground text-background shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isLoading ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
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

                    {hasNextPage && (
                      <div className="flex justify-center mt-10">
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

                    <div className="flex justify-center mt-8 pb-10">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="rounded-full px-8 border-2 hover:bg-foreground hover:text-background transition-all" 
                        asChild
                      >
                        <Link to="/eventos">
                          Ver todos os eventos
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="following-desktop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
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
      <MobileFeed />
      <DesktopLayout />
      <BottomNav />
    </>
  );
}
