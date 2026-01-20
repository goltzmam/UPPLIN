import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play } from "lucide-react";
import { format, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { ShareButton } from "@/components/events/ShareButton";
import { triggerFeedback } from "@/lib/feedback";

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
  // If no end date, assume 3 hours duration
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

function FeedCard({ 
  item, 
  isActive,
  isMuted,
  onToggleMute
}: { 
  item: TikTokFeedItem; 
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [showHeart, setShowHeart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Check if event is live
  const isLive = useMemo(() => isEventLive(item.startAt, item.endAt), [item.startAt, item.endAt]);
  
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

  // Handle video playback
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive && !isPaused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isPaused]);

  // Handle mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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
          <video
            ref={videoRef}
            src={item.videoUrl}
            loop
            playsInline
            muted={isMuted}
            className="h-full w-full object-cover"
          />
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

      {/* Top - Organizer info + Live badge - positioned below overlay header */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] left-3 right-3 z-10">
        <div className="flex items-center justify-between gap-2">
          {/* Organizer */}
          <button
            onClick={handleOrganizerClick}
            className="flex items-center gap-2 min-w-0 flex-1"
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

          {/* Right side badges */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live badge */}
            {isLive && <LiveBadge />}
            
            {/* Price badge */}
            <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <span className={cn(
                "text-xs font-bold",
                (item.minPrice || 0) === 0 ? "text-green-600" : "text-foreground"
              )}>
                {formatPrice(item.minPrice || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 z-10">
        <div className="flex items-end gap-3">
          {/* Event info - left side */}
          <div className="flex-1 min-w-0 pr-2">
            <Link 
              to={`/evento/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block"
            >
              <h3 className="font-display text-base font-bold text-white leading-tight line-clamp-2 mb-1.5">
                {item.title}
              </h3>
              
              <div className="flex flex-col gap-1 text-white/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formattedDate} • {formattedTime}</span>
                </div>
                {(item.venueName || item.addressText) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.venueName || item.addressText}</span>
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Right side actions - compact vertical */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Heart className={cn("h-5 w-5 text-white", isLiked && "fill-accent text-accent")} />
              </div>
              <span className="text-white text-[10px] font-medium">{formatEngagementCount(likeCount)}</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-white text-[10px] font-medium">Chat</span>
            </motion.button>
            
            <div className="flex flex-col items-center gap-0.5">
              <ShareButton
                eventId={item.id}
                eventTitle={item.title}
                eventDate={formattedDate}
                eventImage={item.coverImageUrl}
                iconOnly
                className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
              />
              <span className="text-white text-[10px] font-medium">Share</span>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleSave();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Bookmark className={cn("h-5 w-5 text-white", isSaved && "fill-white")} />
              </div>
              <span className="text-white text-[10px] font-medium">{formatEngagementCount(saveCount)}</span>
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
                <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
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

  const [isMuted, setIsMuted] = useState(true);

  // Pull-to-refresh (only affects when user is at the very top of the feed)
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = useRef(0);

  // Restore scroll position when mounting
  useEffect(() => {
    if (containerRef.current && scrollPosition > 0) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, []);

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
      const newIndex = Math.round(scrollTop / itemHeight);

      if (newIndex !== activeIndexRef.current && newIndex >= 0 && newIndex < items.length) {
        activeIndexRef.current = newIndex;
        triggerFeedback({ haptic: "light" });
        setActiveIndex(newIndex);
      }

      onScrollChange?.(scrollTop);

      const nearBottom = scrollTop + itemHeight * 2 >= scrollHeight - itemHeight;
      if (nearBottom && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    });
  }, [items.length, hasMore, isLoadingMore, onLoadMore, onScrollChange]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!onRefresh || isRefreshing) return;
      const container = containerRef.current;
      if (!container) return;
      if (container.scrollTop === 0) {
        pullStartYRef.current = e.touches[0].clientY;
      }
    },
    [onRefresh, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!onRefresh || isRefreshing) return;
      const container = containerRef.current;
      if (!container) return;
      if (container.scrollTop !== 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - pullStartYRef.current;
      if (diff <= 0) return;

      // Apply resistance, cap max pull
      const distance = Math.min(diff * 0.35, 90);
      setPullDistance(distance);

      // Prevent the iOS rubber-band from fighting with our pull indicator
      if (distance > 10) e.preventDefault();
    },
    [onRefresh, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!onRefresh) {
      setPullDistance(0);
      return;
    }

    const threshold = 60;
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, isRefreshing]);

  useEffect(() => () => {
    if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
  }, []);

  if (isLoading) {
    return (
      <div 
        style={{ 
          height: 'calc(100dvh - var(--app-bottom-offset, 80px))'
        }} 
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
      onTouchStartCapture={handleTouchStart}
      onTouchMoveCapture={handleTouchMove}
      onTouchEndCapture={handleTouchEnd}
      style={{
        height: "calc(100dvh - var(--app-bottom-offset, 80px))",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
      className="relative overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-y-contain"
    >
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
          style={{ 
            height: 'calc(100dvh - var(--app-bottom-offset, 80px))',
            minHeight: 'calc(100dvh - var(--app-bottom-offset, 80px))'
          }} 
          className="w-full snap-start snap-always flex-shrink-0"
        >
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
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
