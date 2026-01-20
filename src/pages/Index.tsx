import React, { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { TikTokFeed } from "@/components/feed/TikTokFeed";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { DesktopFeedCard } from "@/components/feed/DesktopFeedCard";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const MUTE_STORAGE_KEY = "upplin_desktop_muted";

export default function Index() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(MUTE_STORAGE_KEY) !== "false";
    }
    return true;
  });
  const scrollPosRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const feedContainerRef = useRef<HTMLElement>(null);

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

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

  // Infinite scroll observer
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    const sentinel = document.getElementById("feed-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
  // DESKTOP/TABLET: Instagram-style layout with sidebars
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden md:flex min-h-screen bg-background">
      {/* Left Sidebar - Navigation */}
      <DesktopSidebar />

      {/* Main Content - Centered Feed */}
      <main className="flex-1 max-w-[470px] mx-auto border-x border-border/30">
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
                >
                  {isLoading ? (
                    <div className="space-y-4 p-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-sm bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {feedItems.map((item, index) => (
                        <DesktopFeedCard 
                          key={item.id} 
                          item={item} 
                          index={index}
                          globalMuted={globalMuted}
                          onToggleGlobalMute={toggleGlobalMute}
                        />
                      ))}
                      
                      <div id="feed-sentinel" className="h-1" />
                      
                      {isFetchingNextPage && (
                        <div className="flex justify-center py-8">
                          <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                        </div>
                      )}
                      
                      {!hasNextPage && feedItems.length > 0 && (
                        <div className="flex justify-center py-8 text-muted-foreground text-sm">
                          Você viu todos os eventos 🎉
                        </div>
                      )}
                    </>
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

      {/* Right Sidebar - Categories, Trending, Suggestions */}
      <RightSidebar />
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
