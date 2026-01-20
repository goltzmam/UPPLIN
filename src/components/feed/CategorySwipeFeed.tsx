import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TikTokFeed } from "./TikTokFeed";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/feedback";

const PAGE_SIZE = 10;

// Categories configuration
const CATEGORIES = [
  { id: "all", label: "Para você", emoji: "✨" },
  { id: "shows", label: "Shows", emoji: "🎤" },
  { id: "festas", label: "Festas", emoji: "🎉" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "teatro", label: "Teatro", emoji: "🎭" },
  { id: "esportes", label: "Esportes", emoji: "⚽" },
  { id: "gastronomia", label: "Gastro", emoji: "🍷" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

interface CategoryFeedProps {
  category: CategoryId;
  isActive: boolean;
}

function CategoryFeed({ category, isActive }: CategoryFeedProps) {
  const [scrollPos, setScrollPos] = useState(0);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["category-feed", category],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
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

      // Filter by category if not "all"
      if (category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data: data || [],
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: isActive, // Only fetch when category is active
  });

  const events = data?.pages.flatMap((page) => page.data) || [];

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
      endAt: event.end_at,
      venueName: event.venue_name,
      addressText: event.address_text,
      organizerName: event.organizer?.display_name,
      organizerAvatar: event.organizer?.logo_url,
      organizerId: event.organizer_id,
      minPrice,
    };
  });

  return (
    <TikTokFeed
      items={feedItems}
      isLoading={isLoading}
      onLoadMore={fetchNextPage}
      hasMore={!!hasNextPage}
      isLoadingMore={isFetchingNextPage}
      scrollPosition={scrollPos}
      onScrollChange={setScrollPos}
    />
  );
}

interface CategorySwipeFeedProps {
  initialCategory?: CategoryId;
}

export function CategorySwipeFeed({ initialCategory = "all" }: CategorySwipeFeedProps) {
  const [activeIndex, setActiveIndex] = useState(() => 
    CATEGORIES.findIndex((c) => c.id === initialCategory) || 0
  );
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const activeCategory = CATEGORIES[activeIndex];

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.children[activeIndex] as HTMLElement;
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      setIsDragging(false);
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      // Determine direction based on velocity and offset
      if (velocity < -200 || (velocity >= -200 && offset < -threshold)) {
        // Swipe left -> next category
        if (activeIndex < CATEGORIES.length - 1) {
          triggerFeedback({ haptic: "light" });
          setActiveIndex((prev) => prev + 1);
        }
      } else if (velocity > 200 || (velocity <= 200 && offset > threshold)) {
        // Swipe right -> previous category
        if (activeIndex > 0) {
          triggerFeedback({ haptic: "light" });
          setActiveIndex((prev) => prev - 1);
        }
      }
    },
    [activeIndex]
  );

  const handleTabClick = (index: number) => {
    if (index !== activeIndex) {
      triggerFeedback({ haptic: "selection" });
      setActiveIndex(index);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      {/* Category Tabs - Overlay at top, below header */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+56px)] left-0 right-0 z-20 pointer-events-none">
        <div 
          ref={tabsRef}
          className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide pointer-events-auto"
        >
          {CATEGORIES.map((cat, index) => (
            <button
              key={cat.id}
              onClick={() => handleTabClick(index)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                index === activeIndex
                  ? "bg-white text-black shadow-lg"
                  : "bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
              )}
            >
              <span className="mr-1">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Swipeable Feed Container */}
      <motion.div
        ref={containerRef}
        className="h-full w-full flex touch-pan-y"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ x: -activeIndex * 100 + "%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ width: `${CATEGORIES.length * 100}%` }}
      >
        {CATEGORIES.map((cat, index) => (
          <div
            key={cat.id}
            className="h-full"
            style={{ width: `${100 / CATEGORIES.length}%` }}
          >
            <CategoryFeed
              category={cat.id}
              isActive={index === activeIndex}
            />
          </div>
        ))}
      </motion.div>

      {/* Category indicator dots */}
      <div className="absolute bottom-[calc(72px+env(safe-area-inset-bottom,0px)+8px)] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {CATEGORIES.map((_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-full transition-all duration-200",
              index === activeIndex
                ? "w-6 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}