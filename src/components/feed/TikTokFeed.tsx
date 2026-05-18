import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Play, X, Plus, Ticket, Gift, ChevronLeft } from "lucide-react";
import { format, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { ShareButton } from "@/components/events/ShareButton";
import { triggerFeedback } from "@/lib/feedback";
import { EventComments } from "@/components/events/EventComments";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeedSkeleton } from "./FeedSkeleton";
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import { stopAllMediaPipelines } from "@/lib/media";
import { markEventsSeen } from "@/lib/seen-events";

interface TikTokFeedItem {
  id: string;
  slug?: string | null;
  title: string;
  coverImageUrl: string | null;
  videoUrl?: string | null;
  startAt: string;
  endAt?: string | null;
  venueName: string | null;
  addressText: string | null;
  organizerName?: string;
  organizerSlug?: string | null;
  organizerAvatar?: string | null;
  organizerId?: string | null;
  minPrice?: number;
}

interface TikTokFeedProps {
  items: TikTokFeedItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  scrollPosition?: number;
  onScrollChange?: (position: number) => void;
  onRefresh?: () => Promise<void>;
  /** When false, the feed stays mounted but MUST NOT keep playing audio/video. */
  isVisible?: boolean;
}

const SCROLL_POSITION_KEY = "upplin_feed_scroll_position";

function formatEngagementCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

function isEventLive(startAt: string, endAt?: string | null): boolean {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : addHours(start, 3);
  return isWithinInterval(now, { start, end });
}

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">AO VIVO</span>
    </div>
  );
}

// Simplified particles - CSS only, no framer-motion for performance
const LikeParticles = React.memo(function LikeParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Heart 
        className="absolute animate-ping" 
        style={{ 
          color: '#FF2D2D', 
          fill: '#FF2D2D',
          width: 16, 
          height: 16,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }} 
      />
    </div>
  );
});

const SaveParticles = React.memo(function SaveParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Bookmark 
        className="absolute animate-ping text-white fill-white" 
        style={{ 
          width: 14, 
          height: 14,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }} 
      />
    </div>
  );
});

// Simplified FeedRow - delegates ALL video logic to FeedVideoPlayer
const FeedRow = React.memo(function FeedRow({ 
  index, 
  style, 
  items, 
  activeIndex,
  isScrolling,
}: { 
  index: number; 
  style: React.CSSProperties;
  items: TikTokFeedItem[];
  activeIndex: number;
  isScrolling: boolean;
}) {
  const item = items[index];
  const isActive = index === activeIndex && !isScrolling;

  // Horizontal swipe to organizer
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const navigate = useNavigate();
  const [showHeart, setShowHeart] = useState(false);
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showSaveParticles, setShowSaveParticles] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Only fetch comment count when item becomes active - reduced frequency
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["event-comment-count", item.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("event_comments").select("*", { count: "exact", head: true }).eq("event_id", item.id);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - comments don't need to be real-time
    gcTime: 1000 * 60 * 30,
    enabled: isActive,
  });

  const isLive = useMemo(() => isEventLive(item.startAt, item.endAt), [item.startAt, item.endAt]);
  const { isLiked, likeCount, isSaved, toggleLike, toggleSave } = useEventEngagement(item.id);

  const eventDate = new Date(item.startAt);
  const formattedDate = format(eventDate, "d MMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");
  const formatPrice = (cents: number) => cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;
  const eventUrl = `/evento/${item.slug || item.id}`;

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      triggerFeedback({ haptic: "selection", sound: "tap" });
      toggleLike();
      setShowHeart(true);
      setShowLikeParticles(true);
      setTimeout(() => setShowHeart(false), 600);
      setTimeout(() => setShowLikeParticles(false), 700);
    }
  }, [isLiked, toggleLike]);

  const handleLikeClick = useCallback(() => {
    triggerFeedback({ haptic: "light", sound: "tap" });
    if (!isLiked) { setShowLikeParticles(true); setTimeout(() => setShowLikeParticles(false), 700); }
    toggleLike();
  }, [isLiked, toggleLike]);

  const handleSaveClick = useCallback(() => {
    triggerFeedback({ haptic: "light", sound: "tap" });
    if (!isSaved) { setShowSaveParticles(true); setTimeout(() => setShowSaveParticles(false), 600); }
    toggleSave();
  }, [isSaved, toggleSave]);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeLockedRef.current = null;
  }, []);

  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartRef.current.x;
    const dy = touch.clientY - swipeStartRef.current.y;
    // Lock direction after 10px movement
    if (!swipeLockedRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      swipeLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
  }, []);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStartRef.current.x;
    swipeStartRef.current = null;
    // Swipe left → navigate to organizer
    if (swipeLockedRef.current === "horizontal" && dx < -80 && item.organizerId) {
      triggerFeedback({ haptic: "medium" });
      navigate(`/organizador/${item.organizerId}`);
    }
    swipeLockedRef.current = null;
  }, [item.organizerId, navigate]);

  return (
    <div 
      style={style} 
      className="snap-start snap-always" 
      onDoubleClick={handleDoubleTap}
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="relative w-full h-full overflow-hidden">
        {/* Media container - full bleed for immersive feed */}
        <div className="absolute inset-0 w-full h-full">
          {item.videoUrl ? (
            <FeedVideoPlayer
              videoUrl={item.videoUrl}
              coverUrl={item.coverImageUrl}
              isActive={isActive}
              forceStop={isScrolling}
            />
          ) : item.coverImageUrl ? (
            <img 
              src={item.coverImageUrl} 
              alt={item.title} 
              className="absolute inset-0 h-full w-full object-cover z-[1]" 
              loading={index === 0 ? "eager" : isActive ? "eager" : "lazy"} 
              decoding="async"
              {...(index === 0 ? { fetchPriority: "high" as const } : {})}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none z-[2]" />
        </div>

        {/* Swipe hint - only on first card */}
        {index === 0 && item.organizerId && (
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: [0, 0.9, 0.9, 0], x: [0, -24, -24, -40] }}
            transition={{ duration: 2.5, delay: 1.5, ease: "easeInOut" }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-[15] pointer-events-none flex items-center gap-1"
          >
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <ChevronLeft className="h-4 w-4 text-white" />
              <span className="text-white text-xs font-medium whitespace-nowrap">Ver organizador</span>
            </div>
          </motion.div>
        )}

        {/* Double tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative"><Heart className="h-24 w-24" style={{ color: '#FF2D2D', fill: '#FF2D2D' }} /><LikeParticles show={showLikeParticles} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right side action bar */}
        <div className="absolute right-3 z-10 flex flex-col items-center gap-4" style={{ bottom: 'calc(var(--app-bottom-offset, 100px) + 80px)' }}>
          {/* Organizer avatar */}
          <button 
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (item.organizerId) navigate(`/organizador/${item.organizerId}`); }}
            className="relative"
          >
            <div className="h-11 w-11 rounded-full border-2 border-white overflow-hidden">
              {item.organizerAvatar ? (
                <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
              ) : (
                <div 
                  className="h-full w-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
                >
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
            <div 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
            >
              <Plus className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </div>
          </button>

          {/* Like button */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center gap-0.5 relative">
            <div className="relative">
              <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                <Heart 
                  className={cn("h-6 w-6 transition-all", isLiked ? "" : "text-white/90")} 
                  strokeWidth={1.5}
                  style={isLiked ? { color: '#FF2D2D', fill: '#FF2D2D' } : undefined}
                />
              </motion.div>
              <LikeParticles show={showLikeParticles && !showHeart} />
            </div>
            <span className="text-white/80 text-[10px] font-medium">{formatEngagementCount(likeCount)}</span>
          </motion.button>

          {/* Comments button */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-0.5">
            <MessageCircle className="h-6 w-6 text-white/90" strokeWidth={1.5} />
            <span className="text-white/80 text-[10px] font-medium">{formatEngagementCount(commentCount)}</span>
          </motion.button>

          {/* Bookmark button */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleSaveClick(); }} className="flex flex-col items-center gap-0.5 relative">
            <div className="relative">
              <motion.div animate={{ scale: isSaved ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                <Bookmark className={cn("h-6 w-6 transition-all", isSaved ? "fill-white text-white" : "text-white/90")} strokeWidth={1.5} />
              </motion.div>
              <SaveParticles show={showSaveParticles} />
            </div>
          </motion.button>

          {/* Share button */}
          <ShareButton 
            eventId={item.id} 
            eventTitle={item.title} 
            eventDate={formattedDate} 
            eventImage={item.coverImageUrl} 
            iconOnly
            className="flex flex-col items-center gap-0.5 text-white/90 [&_svg]:h-6 [&_svg]:w-6"
          />
        </div>

        {/* Bottom event info */}
        <div className="absolute bottom-0 left-0 right-16 p-3 z-10" style={{ paddingBottom: 'calc(var(--app-bottom-offset, 100px) + 16px)' }}>
          <span className="text-white/70 text-xs font-medium block mb-0.5">
            {item.organizerName || "Organizador"}
          </span>
          
          <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 mb-1.5">
            {item.title}
          </h3>
          
          <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
            <span>{formattedDate} • {formattedTime}</span>
            {(item.venueName || item.addressText) && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{item.venueName || item.addressText}</span>
              </>
            )}
            {isLive && <LiveBadge />}
          </div>

          {/* Buy ticket button */}
          {(() => {
            const isFree = (item.minPrice || 0) === 0;
            const IconComponent = isFree ? Gift : Ticket;
            return (
              <div className="flex items-center gap-2">
                {isFree && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-3 py-1.5 rounded-full bg-success/20 border border-success/40 backdrop-blur-sm"
                  >
                    <span className="text-success text-xs font-bold tracking-wide">GRÁTIS</span>
                  </motion.div>
                )}
                
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block rounded-full"
                >
                  <Link 
                    to={eventUrl}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFeedback({ haptic: "medium", sound: "tap" });
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg transition-colors",
                      isFree && "bg-success text-success-foreground"
                    )}
                    style={!isFree ? {
                      background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
                      color: "white",
                    } : undefined}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{isFree ? "Participar" : "Comprar"}</span>
                    {!isFree && (
                      <span className="opacity-90">• {formatPrice(item.minPrice || 0)}</span>
                    )}
                  </Link>
                </motion.div>
              </div>
            );
          })()}
        </div>

        <Drawer open={showComments} onOpenChange={setShowComments}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="border-b border-border px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-base font-semibold">
                  Comentários
                  {commentCount > 0 && (
                    <span className="text-muted-foreground font-normal ml-1.5">
                      {formatEngagementCount(commentCount)}
                    </span>
                  )}
                </DrawerTitle>
                <button 
                  onClick={() => setShowComments(false)} 
                  className="h-8 w-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden p-4">
              <EventComments eventId={item.id} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
});

export function TikTokFeed({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  isLoadingMore,
  scrollPosition = 0,
  onScrollChange,
  onRefresh,
  isVisible = true,
}: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const location = useLocation();
  const mountedPathRef = useRef(location.pathname);
  // Initialize with window.innerHeight to prevent zero-height flash
  const [containerHeight, setContainerHeight] = useState(() => 
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    try {
      const cached = sessionStorage.getItem(SCROLL_POSITION_KEY);
      return cached ? parseInt(cached, 10) : 0;
    } catch { return 0; }
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const prevIndexRef = useRef(activeIndex);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  // HARD stop any media when this feed is kept mounted but not visible (tabs/overlays)
  useEffect(() => {
    if (!isVisible) {
      setIsScrolling(true);
      stopAllMediaPipelines();
      return;
    }
    // When becoming visible again, allow playback to resume normally
    setIsScrolling(false);
  }, [isVisible]);

  // If route changes while this component is still mounted (e.g. transitions), stop media and prevent restart
  useEffect(() => {
    if (location.pathname !== mountedPathRef.current) {
      setIsScrolling(true);
      stopAllMediaPipelines();
    }
  }, [location.pathname]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      const height = window.innerHeight;
      if (height > 0 && height !== containerHeight) {
        setContainerHeight(height);
      }
    };
    
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [containerHeight]);

  // IntersectionObserver for active item detection (replaces scroll handler)
  useEffect(() => {
    const container = containerRef.current;
    if (!isVisible || !container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setActiveIndex((prev) => {
              if (index !== prev) {
                // Only trigger haptic on actual index change
                if (index !== prevIndexRef.current) {
                  prevIndexRef.current = index;
                  triggerFeedback({ haptic: "selection" });
                }
                return index;
              }
              return prev;
            });
            break; // Exit after first match
          }
        }
      },
      { 
        root: container,
        threshold: 0.7,
        rootMargin: '0px'
      }
    );

    // Observe all items - use requestIdleCallback for non-blocking
    const observeItems = () => {
      itemRefs.current.forEach((element) => {
        observer.observe(element);
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(observeItems, { timeout: 100 });
    } else {
      setTimeout(observeItems, 0);
    }

    return () => observer.disconnect();
  }, [containerHeight, items.length, isVisible]);

  // Save scroll position and mark event as seen
  useEffect(() => {
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, String(activeIndex));
      onScrollChange?.(activeIndex);
      // Mark current event as seen
      if (items[activeIndex]) {
        markEventsSeen([items[activeIndex].id]);
      }
    } catch {}
  }, [activeIndex, onScrollChange, items]);

  // Detect scrolling state (for pausing videos during scroll)
  const handleScroll = useCallback(() => {
    if (!isVisible) return;
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
      scrollTimeoutRef.current = null;
    }, 150);

    // Load more when approaching end
    const container = containerRef.current;
    if (container && containerHeight > 0) {
      const currentIndex = Math.round(container.scrollTop / containerHeight);
      if (currentIndex >= items.length - 3 && hasMore && !isLoadingMore) {
        onLoadMore?.();
      }
    }
  }, [containerHeight, items.length, hasMore, isLoadingMore, onLoadMore, isVisible]);

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Touch handlers: pull-to-refresh + flick-to-snap (native-like)
  const touchStartTimeRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const lastTouchTimeRef = useRef(0);
  const touchVelocityRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    touchStartY.current = y;
    lastTouchYRef.current = y;
    touchStartTimeRef.current = performance.now();
    lastTouchTimeRef.current = touchStartTimeRef.current;
    touchVelocityRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    const y = e.touches[0].clientY;
    const now = performance.now();
    const dt = now - lastTouchTimeRef.current;
    if (dt > 0) {
      // px/ms — positive when moving finger down (scroll up)
      touchVelocityRef.current = (y - lastTouchYRef.current) / dt;
    }
    lastTouchYRef.current = y;
    lastTouchTimeRef.current = now;

    if (!container || container.scrollTop > 0) return;
    const deltaY = y - touchStartY.current;
    if (deltaY > 0 && !isRefreshing) {
      setPullDistance(Math.min(deltaY * 0.4, 80));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    // Pull-to-refresh
    if (pullDistance >= 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else if (pullDistance > 0) {
      setPullDistance(0);
    }

    // Flick-to-snap: if quick swipe, jump to next/prev item smoothly
    const container = containerRef.current;
    if (!container || containerHeight <= 0) return;
    const v = touchVelocityRef.current; // px/ms
    const totalTime = performance.now() - touchStartTimeRef.current;
    const totalDelta = lastTouchYRef.current - touchStartY.current;
    // Flick: require fast AND meaningful gesture so swipes leves não pulam
    const minDelta = Math.max(40, containerHeight * 0.08);
    const isFlick =
      totalTime < 280 &&
      Math.abs(v) > 0.6 &&
      Math.abs(totalDelta) > minDelta;
    if (isFlick) {
      const currentIdx = Math.round(container.scrollTop / containerHeight);
      const dir = v < 0 ? 1 : -1; // finger up → next, finger down → prev
      const targetIdx = Math.max(0, Math.min(items.length - 1, currentIdx + dir));
      container.scrollTo({ top: targetIdx * containerHeight, behavior: "smooth" });
    }
  }, [pullDistance, onRefresh, isRefreshing, containerHeight, items.length]);


  // Restore scroll position on mount
  useEffect(() => {
    const container = containerRef.current;
    if (container && containerHeight > 0 && activeIndex > 0) {
      container.scrollTop = activeIndex * containerHeight;
    }
  }, [containerHeight]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        container.scrollTo({ top: (activeIndex + 1) * containerHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        container.scrollTo({ top: (activeIndex - 1) * containerHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, containerHeight, isVisible]);

  // Use actual containerHeight (already initialized with window.innerHeight)
  if (isLoading) return <div style={{ height: containerHeight }}><FeedSkeleton /></div>;

  if (items.length === 0) {
    return (
      <div style={{ height: containerHeight }} className="flex items-center justify-center text-center p-8 bg-black">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <p className="text-white font-semibold mb-1">Nenhum evento encontrado</p>
          <p className="text-sm text-white/60">Explore categorias ou siga organizadores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ height: containerHeight }}>
      {/* Pull to refresh indicator */}
      {onRefresh && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center z-20" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className={cn("mt-2 rounded-full bg-background/80 backdrop-blur px-3 py-1.5 border border-border/50 transition-all duration-200", pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0")}
            style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}>
            {isRefreshing ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-foreground/80">Atualizando...</span>
              </div>
            ) : (
              <span className="text-xs text-foreground/80">{pullDistance >= 60 ? "Solte para atualizar" : "Puxe para atualizar"}</span>
            )}
          </div>
        </div>
      )}

      {/* Native scroll container with CSS snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-hide touch-pan-y"
        style={{
          scrollSnapType: 'y mandatory',
          scrollSnapStop: 'always',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          overscrollBehaviorY: 'contain',
        }}
      >
        {items.map((item, index) => {
          const effectiveActiveIndex = isVisible ? activeIndex : -1;
          const isInRenderWindow = Math.abs(index - effectiveActiveIndex) <= 2;
          const effectiveIsScrolling = !isVisible ? true : isScrolling;
          
          return (
            <div
              key={item.id}
              data-index={index}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
              style={{ height: containerHeight }}
              className="snap-start snap-always"
            >
              {isInRenderWindow ? (
                <FeedRow
                  index={index}
                  style={{ height: '100%' }}
                  items={items}
                  activeIndex={effectiveActiveIndex}
                  isScrolling={effectiveIsScrolling}
                />
              ) : (
                <div className="h-full bg-black" />
              )}
            </div>
          );
        })}
      </div>

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-foreground/80">Carregando...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
