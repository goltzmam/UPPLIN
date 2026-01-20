import React, { useState, useCallback } from "react";
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
import { FeaturedStories } from "@/components/home/FeaturedStories";
import { CategoriesCarousel } from "@/components/home/CategoriesCarousel";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { 
  Search, 
  MapPin, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

// Trending section card
function TrendingCard({ title, subtitle, image, href }: {
  title: string;
  subtitle: string;
  image: string;
  href: string;
}) {
  return (
    <Link to={href} className="block relative rounded-2xl overflow-hidden aspect-[2/1] min-w-[280px]">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
          <TrendingUp className="h-3 w-3" />
          <span>{subtitle}</span>
        </div>
        <h3 className="font-display font-bold text-white">{title}</h3>
      </div>
    </Link>
  );
}

export default function Index() {
  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch events with infinite scroll
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["homepage-events-infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from("events")
        .select(`
          *,
          organizer:organizer_id(display_name, logo_url),
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

  // Flatten all pages into one array
  const events = data?.pages.flatMap(page => page.data) || [];

  // Transform events for TikTok feed
  const feedItems = events.map((event: any) => {
    const videoMedia = event.event_media?.find((m: any) => m.type === "video");
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;

    return {
      id: event.id,
      title: event.title,
      coverImageUrl: event.cover_image_url,
      videoUrl: videoMedia?.url || null,
      startAt: event.start_at,
      venueName: event.venue_name,
      addressText: event.address_text,
      organizerName: event.organizer?.display_name,
      organizerAvatar: event.organizer?.logo_url,
      organizerId: event.organizer_id,
      minPrice,
    };
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    // Reset infinite feed pages
    await queryClient.removeQueries({ queryKey: ["homepage-events-infinite"] });
    await queryClient.invalidateQueries({ queryKey: ["featured-events"] });
    // Small delay for visual feedback
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      {/* Search Bar - Fixed below header */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 py-3">
        <div className="container">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 bg-muted rounded-full px-4 py-2.5">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Buscar eventos, artistas..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => navigate("/eventos")}
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-[calc(3.5rem+3.5rem)]"> {/* Header (56px) + Search bar (56px) */}
          {/* Featured Stories - Instagram-style with gradient rings */}
          <section className="hidden md:block border-b border-border/30">
            <FeaturedStories />
          </section>

        {/* Categories - Pill-style chips */}
        <section className="hidden md:block border-b border-border/30">
          <CategoriesCarousel />
        </section>

        {/* Trending Section */}
        <section className="hidden md:block py-6">
          <div className="container">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-display text-lg font-bold">Em Alta</h2>
              </div>
              <Link to="/eventos" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {trending.map((item) => (
                <TrendingCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* Feed Section - TikTok Style with Tabs */}
        <section>
          <div className="md:container">
            {/* Tab Navigation */}
            <div className="sticky top-[112px] z-30 flex items-center justify-center gap-6 border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-0">
              <button
                onClick={() => setActiveTab("foryou")}
                className={cn(
                  "pb-3 text-base font-semibold transition-all border-b-2 -mb-px",
                  activeTab === "foryou" 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Para Você
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={cn(
                  "pb-3 text-base font-semibold transition-all border-b-2 -mb-px",
                  activeTab === "following" 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Seguindo
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "foryou" ? (
                <motion.div
                  key="foryou"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {/* TikTok-style vertical feed on mobile */}
                  <div className="md:hidden">
                    <TikTokFeed
                      items={feedItems}
                      isLoading={isLoading}
                      onLoadMore={fetchNextPage}
                      hasMore={!!hasNextPage}
                      isLoadingMore={isFetchingNextPage}
                    />
                  </div>

                  {/* Grid layout on desktop */}
                  <div className="hidden md:block">
                    {isLoading ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="feed-card animate-pulse bg-muted" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {feedItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="feed-card group"
                          >
                            <Link to={`/evento/${item.id}`} className="block h-full">
                              <div className="absolute inset-0">
                                {item.coverImageUrl ? (
                                  <img
                                    src={item.coverImageUrl}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2 mb-1">
                                  {item.title}
                                </h3>
                                <p className="text-white/70 text-sm">{item.organizerName}</p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Load more */}
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" size="lg" className="rounded-full" asChild>
                        <Link to="/eventos">
                          Ver mais eventos
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="following"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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
      <BottomNav />
    </div>
  );
}
