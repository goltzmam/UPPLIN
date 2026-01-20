import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play, X } from "lucide-react";
import { format, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { ShareButton } from "@/components/events/ShareButton";
import { triggerFeedback } from "@/lib/feedback";
import { EventComments } from "@/components/events/EventComments";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface TikTokFeedItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  videoUrl?: string | null;
  startAt: string;
  endAt?: string | null;
  venueName: string | null;
  addressText: string | null;
  organizerName?: string;
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
}

// Height calculation constant for consistency
const FEED_HEIGHT_STYLE = { height: 'calc(100dvh - var(--app-bottom-offset, 80px))' };

// LocalStorage key for mute preference
const MUTE_STORAGE_KEY = "upplin_feed_muted";

function formatEngagementCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Check if event is happening now
function isEventLive(startAt: string, endAt?: string | null): boolean {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : addHours(start, 3);
  return isWithinInterval(now, { start, end });
}

// Live badge component with pulsing animation
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

// Progress indicator component
function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <span className="text-white/90 text-xs font-bold tabular-nums drop-shadow-lg">
        {current}/{total}
      </span>
    </motion.div>
  );
}

// Mini scroll map component
function ScrollMiniMap({ 
  current, 
  total, 
  maxVisible = 7 
}: { 
  current: number; 
  total: number;
  maxVisible?: number;
}) {
  // Show dots around current position
  const visibleRange = useMemo(() => {
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, current - half);
    let end = Math.min(total - 1, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }
    
    const dots: number[] = [];
    for (let i = start; i <= end; i++) {
      dots.push(i);
    }
    return { dots, start, end };
  }, [current, total, maxVisible]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {visibleRange.start > 0 && (
        <div className="w-1 h-1 rounded-full bg-white/30" />
      )}
      {visibleRange.dots.map((idx) => (
        <motion.div
          key={idx}
          animate={{
            scale: idx === current ? 1 : 0.6,
            opacity: idx === current ? 1 : 0.4,
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-full transition-all",
            idx === current 
              ? "w-1.5 h-3 bg-white" 
              : "w-1 h-1 bg-white/50"
          )}
        />
      ))}
      {visibleRange.end < total - 1 && (
        <div className="w-1 h-1 rounded-full bg-white/30" />
      )}
    </div>
  );
}

// Premium placeholder while video loads
function VideoPlaceholder({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  return (
    <div className="absolute inset-0 z-[1]">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      )}
      {/* Shimmer overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)'
          }}
        />
      </div>
      {/* Center loading */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}

function FeedCard({ 
  item, 
  isActive,
  visibilityRatio,
  isMuted,
  onToggleMute,
  shouldPreload,
}: { 
  item: TikTokFeedItem; 
  isActive: boolean;
  visibilityRatio: number;
  isMuted: boolean;
  onToggleMute: () => void;
  shouldPreload?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [showHeart, setShowHeart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Check if event is live
  const isLive = useMemo(() => isEventLive(item.startAt, item.endAt), [item.startAt, item.endAt]);
  
  // Smart autoplay: only play when 70%+ visible and active
  const shouldPlay = isActive && visibilityRatio >= 0.7 && !isPaused;
  
  // Use persistent engagement
  const { 
    isLiked, 
    likeCount, 
    isSaved, 
    saveCount, 
    toggleLike, 
    toggleSave 
  } = useEventEngagement(item.id);

  const eventDate = new Date(item.startAt);
  const formattedDate = format(eventDate, "d MMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(0)}`;
  };

  // Handle video playback based on visibility
  useEffect(() => {
    if (!videoRef.current) return;

    if (shouldPlay) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [shouldPlay]);

  // Handle mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Track video loaded state
  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
  }, []);

  const handleDoubleTap = () => {
    if (!isLiked) {
      triggerFeedback({ haptic: "selection", sound: "tap" });
      toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
    }
  };

  const handleTap = () => {
    if (item.videoUrl) {
      setIsPaused(!isPaused);
    }
  };

  const handleOrganizerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (item.organizerId) {
      navigate(`/organizador/${item.organizerId}`);
    }
  };

  return (
    <div 
      className="relative h-full w-full"
      onDoubleClick={handleDoubleTap}
      onClick={handleTap}
    >
      {/* Background Media */}
      <div className="absolute inset-0">
        {item.videoUrl ? (
          <>
            {/* Premium placeholder while loading */}
            {!videoLoaded && (
              <VideoPlaceholder coverUrl={item.coverImageUrl} title={item.title} />
            )}
            <video
              ref={videoRef}
              src={item.videoUrl}
              loop
              playsInline
              muted={isMuted}
              preload={shouldPreload || isActive ? "auto" : "metadata"}
              onLoadedData={handleVideoLoaded}
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                videoLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
      </div>

      {/* Double tap heart animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="h-24 w-24 text-accent fill-accent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && item.videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"
          >
            <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top - Organizer info - positioned below overlay header */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] left-3 right-16 z-10">
        <div className="flex items-center gap-2">
          {/* Organizer */}
          <button
            onClick={handleOrganizerClick}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="avatar-ring-gradient p-[2px] rounded-full shrink-0">
              <div className="h-9 w-9 rounded-full bg-muted overflow-hidden">
                {item.organizerAvatar ? (
                  <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {item.organizerName?.[0] || "O"}
                  </div>
                )}
              </div>
            </div>
            <span className="text-white text-sm font-semibold drop-shadow-lg truncate">
              @{item.organizerName?.replace(/\s+/g, "").toLowerCase() || "organizador"}
            </span>
          </button>

          {/* Live badge */}
          {isLive && <LiveBadge />}
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 z-10">
        <div className="flex items-end gap-4">
          {/* Event info - left side */}
          <div className="flex-1 min-w-0 pr-4">
            <Link 
              to={`/evento/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block"
            >
              {/* Price badge inline with title */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  (item.minPrice || 0) === 0 
                    ? "bg-green-500 text-white" 
                    : "bg-white text-black"
                )}>
                  {formatPrice(item.minPrice || 0)}
                </div>
              </div>
              
              <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2 mb-2">
                {item.title}
              </h3>
              
              <div className="flex flex-col gap-1.5 text-white/85 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{formattedDate} • {formattedTime}</span>
                </div>
                {(item.venueName || item.addressText) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.venueName || item.addressText}</span>
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Right side actions - vertical column */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Heart className={cn("h-5 w-5", isLiked ? "fill-accent text-accent" : "text-white")} />
              </div>
              <span className="text-white text-[10px] font-semibold drop-shadow-lg">{formatEngagementCount(likeCount)}</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(true);
              }}
              className="flex flex-col items-center"
            >
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
            </motion.button>
            
            <ShareButton
              eventId={item.id}
              eventTitle={item.title}
              eventDate={formattedDate}
              eventImage={item.coverImageUrl}
              iconOnly
              className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
            />
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleSave();
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Bookmark className={cn("h-5 w-5", isSaved ? "fill-white text-white" : "text-white")} />
              </div>
              <span className="text-white text-[10px] font-semibold drop-shadow-lg">{formatEngagementCount(saveCount)}</span>
            </motion.button>

            {item.videoUrl && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                className="flex flex-col items-center"
              >
                <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-white" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-white" />
                  )}
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold">Comentários</DrawerTitle>
              <button 
                onClick={() => setShowComments(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <EventComments eventId={item.id} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function TikTokFeed({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  isLoadingMore,
  scrollPosition = 0,
  onScrollChange,
  onRefresh,
}: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);

  // Keep references to each snap item for IntersectionObserver
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibilityRatios, setVisibilityRatios] = useState<Map<number, number>>(new Map());
  const visibilityRatiosRef = useRef<Map<number, number>>(new Map());

  // Load mute preference from localStorage
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const stored = localStorage.getItem(MUTE_STORAGE_KEY);
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  // Save mute preference to localStorage
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(newValue));
      } catch {}
      return newValue;
    });
  }, []);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const setPull = useCallback((v: number) => {
    pullDistanceRef.current = v;
    setPullDistance(v);
  }, []);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Restore scroll position when mounting
  useEffect(() => {
    if (containerRef.current && scrollPosition > 0) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  // Scroll handler: keep it lightweight (no active video math here)
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    if (scrollRafRef.current) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!containerRef.current) return;

      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;

      onScrollChange?.(scrollTop);

      const nearBottom = scrollTop + itemHeight * 2 >= scrollHeight - itemHeight;
      if (nearBottom && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    });
  }, [items.length, hasMore, isLoadingMore, onLoadMore, onScrollChange]);

  // IntersectionObserver-based active card with visibility tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") return;

    visibilityRatiosRef.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idxStr = (entry.target as HTMLElement).dataset.index;
          const idx = idxStr ? Number(idxStr) : NaN;
          if (!Number.isFinite(idx)) continue;
          visibilityRatiosRef.current.set(idx, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        // Update visibility state for smart autoplay
        setVisibilityRatios(new Map(visibilityRatiosRef.current));

        // Pick the most visible card
        let bestIdx = activeIndexRef.current;
        let bestRatio = visibilityRatiosRef.current.get(bestIdx) ?? 0;
        for (const [idx, ratio] of visibilityRatiosRef.current.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }

        // Only switch when there's a clear winner (70%+ visible)
        if (bestIdx !== activeIndexRef.current && bestRatio >= 0.7) {
          activeIndexRef.current = bestIdx;
          triggerFeedback({ haptic: "light" });
          setActiveIndex(bestIdx);
        }
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.6, 0.7, 0.75, 0.9, 1],
      }
    );

    // Observe current items
    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items.length]);

  // Native touch listeners for pull-to-refresh
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onRefresh) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (container.scrollTop !== 0) return;
      pullStartYRef.current = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (container.scrollTop !== 0) return;

      const currentY = e.touches[0]?.clientY ?? 0;
      const diff = currentY - pullStartYRef.current;
      if (diff <= 0) return;

      const distance = Math.min(diff * 0.35, 90);
      setPull(distance);

      if (distance > 10) e.preventDefault();
    };

    const onTouchEnd = async () => {
      const threshold = 60;
      const currentPull = pullDistanceRef.current;

      if (currentPull >= threshold && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPull(threshold * 0.6);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, setPull]);

  useEffect(() => () => {
    if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
  }, []);

  if (isLoading) {
    return (
      <div 
        style={{ height: 'calc(100dvh - var(--app-bottom-offset, 80px))' }} 
        className="relative overflow-hidden bg-black"
      >
        {/* Skeleton with shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        
        {/* Animated shimmer overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)'
            }}
          />
        </div>

        {/* Skeleton content */}
        <div className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] left-3 right-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-700 animate-pulse" />
            <div className="h-4 w-32 rounded bg-zinc-700 animate-pulse" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-zinc-700 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-zinc-700 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-zinc-700 animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full bg-zinc-700 animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Center loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-white/60 text-sm font-medium">Carregando feed...</span>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        style={FEED_HEIGHT_STYLE} 
        className="flex items-center justify-center text-center p-8 bg-background"
      >
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">Nenhum evento encontrado</p>
          <p className="text-sm text-muted-foreground">
            Explore categorias ou siga organizadores
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: "calc(100dvh - var(--app-bottom-offset, 80px))",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
      className="relative overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-y-contain"
    >

      {/* Mini scroll map - right side center */}
      <div 
        className="fixed z-30 pointer-events-none"
        style={{ 
          top: "50%", 
          right: "8px",
          transform: "translateY(-50%)"
        }}
      >
        <ScrollMiniMap current={activeIndex} total={items.length} />
      </div>

      {/* Pull-to-refresh indicator */}
      {onRefresh && (
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center z-20"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div
            className={cn(
              "mt-2 rounded-full bg-background/80 backdrop-blur px-3 py-1.5 border border-border/50",
              pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
            )}
            style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
          >
            <span className="text-xs text-foreground/80">
              {isRefreshing ? "Atualizando..." : pullDistance >= 60 ? "Solte para atualizar" : "Puxe para atualizar"}
            </span>
          </div>
        </div>
      )}

      {items.map((item, index) => (
        <div 
          key={item.id} 
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          data-index={index}
          style={{ 
            height: 'calc(100dvh - var(--app-bottom-offset, 80px))',
            minHeight: 'calc(100dvh - var(--app-bottom-offset, 80px))'
          }} 
          className="w-full snap-start snap-always flex-shrink-0"
        >
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            visibilityRatio={visibilityRatios.get(index) ?? 0}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            shouldPreload={index === activeIndex + 1}
          />
        </div>
      ))}
      
      {/* Discrete loading indicator for infinite scroll */}
      {isLoadingMore && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white/80 text-xs">Carregando...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
