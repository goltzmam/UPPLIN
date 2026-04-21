import React, { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { TikTokFeed } from "@/components/feed/TikTokFeed";
import { DesktopTikTokFeed } from "@/components/feed/DesktopTikTokFeed";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { stopAllMediaPipelines } from "@/lib/media";
import { prioritizeUnseenEvents, markEventsSeen } from "@/lib/seen-events";
import { prioritizeNearbyItems } from "@/lib/geo";
import { useUserLocation } from "@/hooks/use-user-location";
import { LocationPrompt } from "@/components/location/LocationPrompt";

const PAGE_SIZE = 12;

export default function Index() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrollPosRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0
  });

  const events = data?.pages.flatMap(page => page.data) || [];

  // Demo cover images (fallback when no cover is provided)
  const DEMO_COVER_URLS = [
    "https://images.unsplash.com/photo-1521337706264-a414f153a5fc?w=1200&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80"
  ];

  // Demo video URL from public CDN for first event display
  const DEMO_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

  const rawFeedItems = events.map((event: any, index: number) => {
    const videoMedia = event.event_media?.find((m: any) => m.type === "video");
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;
    const coverImageUrl = event.cover_image_url || DEMO_COVER_URLS[index % DEMO_COVER_URLS.length];
    const videoUrl = videoMedia?.url || (index === 0 ? DEMO_VIDEO_URL : null);

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverImageUrl,
      videoUrl,
      startAt: event.start_at,
      endAt: event.end_at,
      venueName: event.venue_name,
      addressText: event.address_text,
      organizerName: event.organizer?.display_name,
      organizerSlug: event.organizer?.slug,
      organizerAvatar: event.organizer?.logo_url,
      organizerId: event.organizer_id,
      minPrice
    };
  });

  // Prioritize unseen events — push already-viewed events to the end
  const feedItems = prioritizeUnseenEvents(rawFeedItems);

  // Mark the first few visible events as seen after data loads
  useEffect(() => {
    if (feedItems.length > 0) {
      // Mark the first 3 events as seen immediately (user will see them on load)
      const firstBatch = feedItems.slice(0, 3).map(e => e.id);
      markEventsSeen(firstBatch);
    }
  }, [feedItems.length > 0 && feedItems[0]?.id]);

  const handleRefresh = useCallback(async () => {
    await queryClient.removeQueries({ queryKey: ["homepage-events-infinite"] });
    await new Promise(resolve => setTimeout(resolve, 400));
  }, [queryClient]);

  // Shared Header Component for both mobile and desktop
  const FeedHeader = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <div className={cn(
      "absolute top-0 left-0 right-0 z-30 pointer-events-none"
    )}>
      <div className="h-[env(safe-area-inset-top,0px)]" />
      
      <div className={cn(
        "flex items-center justify-between px-3 py-3 pointer-events-auto transition-colors duration-300",
        activeTab === "following" && "bg-background"
      )}>
        {/* Logo left - with gradient - larger on mobile/tablet */}
        <Link 
          to="/" 
          className={cn(
            "font-display text-xl md:text-2xl font-bold tracking-tight shrink-0 transition-colors",
            isDesktop && "hidden" // Hide on desktop since sidebar has logo
          )}
          style={{ 
            background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          UPPLIN
        </Link>
        
        {/* Centered tabs */}
        <div className={cn("flex items-center gap-4", isDesktop ? "mx-auto" : "mx-4")}>
          <button 
            onClick={() => {
              stopAllMediaPipelines();
              setActiveTab("following");
            }} 
            className={cn(
              "relative py-0.5 text-[13px] font-medium transition-all whitespace-nowrap",
              activeTab === "following" 
                ? "text-foreground" 
                : "text-white/50"
            )}
          >
            Seguindo
            {activeTab === "following" && (
              <motion.div 
                layoutId="tab-underline" 
                className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-foreground rounded-full" 
                transition={{ type: "spring", stiffness: 500, damping: 35 }} 
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("foryou")} 
            className={cn(
              "relative py-0.5 text-[13px] font-medium transition-all whitespace-nowrap",
              activeTab === "foryou" 
                ? "text-white" 
                : activeTab === "following" 
                  ? "text-muted-foreground" 
                  : "text-white/50"
            )}
          >
            Para você
            {activeTab === "foryou" && (
              <motion.div 
                layoutId="tab-underline" 
                className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-white rounded-full" 
                transition={{ type: "spring", stiffness: 500, damping: 35 }} 
              />
            )}
          </button>
        </div>

        {/* Empty space for balance */}
        <div className={cn("shrink-0", isDesktop ? "hidden" : "w-12")} />
      </div>
    </div>
  );

  // =====================================================================
  // MOBILE: Fullscreen TikTok-style feed - Simplified transitions
  // =====================================================================
  const MobileFeed = () => (
    <div className="fixed inset-0 z-0 lg:hidden w-full h-full overflow-hidden">
      {/* For You feed - always rendered, visibility controlled by CSS */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-150",
          activeTab === "foryou" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}
      >
        <TikTokFeed 
          items={feedItems} 
          isLoading={isLoading} 
          onLoadMore={fetchNextPage} 
          hasMore={!!hasNextPage} 
          isLoadingMore={isFetchingNextPage} 
          scrollPosition={scrollPosRef.current} 
          onScrollChange={pos => { scrollPosRef.current = pos; }} 
          onRefresh={handleRefresh} 
          isVisible={activeTab === "foryou" && !isSearchOpen}
        />
      </div>

      {/* Following feed - always rendered, visibility controlled by CSS */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full bg-background overflow-y-auto scrollbar-hide pb-20 transition-opacity duration-150",
          activeTab === "following" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}
      >
        <div className="pt-24">
          <FollowingFeed />
        </div>
      </div>

      <FeedHeader />
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );

  // =====================================================================
  // DESKTOP/TABLET: TikTok-style layout with minimal sidebar
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden lg:block h-screen w-full bg-background">
      {/* Left Sidebar - Fixed TikTok style */}
      <TikTokDesktopSidebar />

      {/* Main Content - Offset for fixed sidebar */}
      <main className="h-full ml-[72px] relative">
        {/* For You feed - always rendered, visibility controlled by CSS */}
        <div 
          className={cn(
            "absolute inset-0 h-full transition-opacity duration-150",
            activeTab === "foryou" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <DesktopTikTokFeed
            items={feedItems}
            isLoading={isLoading}
            onLoadMore={fetchNextPage}
            hasMore={!!hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onRefresh={handleRefresh}
            isVisible={activeTab === "foryou" && !isSearchOpen}
          />
        </div>

        {/* Following feed - always rendered, visibility controlled by CSS */}
        <div 
          className={cn(
            "absolute inset-0 h-full bg-background overflow-y-auto scrollbar-hide transition-opacity duration-150",
            activeTab === "following" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="max-w-2xl mx-auto py-20 px-4">
            <FollowingFeed />
          </div>
        </div>

        {/* Header overlay */}
        <FeedHeader isDesktop />
      </main>
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
