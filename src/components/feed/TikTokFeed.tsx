import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Play, X, Plus, Ticket, Gift } from "lucide-react";
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

// Throttle utility for scroll performance
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastTime);
    
    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastTime = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}

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

const LikeParticles = React.memo(function LikeParticles({ show }: { show: boolean }) {
  const particles = useMemo(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: (i * 30) + Math.random() * 15,
      distance: 60 + Math.random() * 40,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.1,
    })), []
  );

  return (
    <AnimatePresence>
      {show && particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1, 0.5],
            x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
            y: Math.sin(particle.angle * Math.PI / 180) * particle.distance,
            opacity: [1, 1, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: particle.delay, ease: "easeOut" }}
          className="absolute pointer-events-none"
          style={{ width: particle.size, height: particle.size }}
        >
          <Heart className="w-full h-full text-accent fill-accent" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
});

const SaveParticles = React.memo(function SaveParticles({ show }: { show: boolean }) {
  const particles = useMemo(() => 
    Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      angle: (i * 45) + Math.random() * 20,
      distance: 40 + Math.random() * 30,
      size: 3 + Math.random() * 3,
      delay: Math.random() * 0.08,
    })), []
  );

  return (
    <AnimatePresence>
      {show && particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1, 0.3],
            x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
            y: Math.sin(particle.angle * Math.PI / 180) * particle.distance,
            opacity: [1, 1, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: particle.delay, ease: "easeOut" }}
          className="absolute pointer-events-none"
          style={{ width: particle.size, height: particle.size }}
        >
          <Bookmark className="w-full h-full text-white fill-white" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
});

const ScrollMiniMap = React.memo(function ScrollMiniMap({ current, total, maxVisible = 7 }: { current: number; total: number; maxVisible?: number }) {
  const visibleRange = useMemo(() => {
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, current - half);
    let end = Math.min(total - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    const dots: number[] = [];
    for (let i = start; i <= end; i++) dots.push(i);
    return { dots, start, end };
  }, [current, total, maxVisible]);

  if (total <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {visibleRange.start > 0 && <div className="w-1 h-1 rounded-full bg-white/30" />}
      {visibleRange.dots.map((idx) => (
        <motion.div
          key={idx}
          animate={{ scale: idx === current ? 1 : 0.6, opacity: idx === current ? 1 : 0.4 }}
          transition={{ duration: 0.2 }}
          className={cn("rounded-full", idx === current ? "w-1.5 h-3 bg-white" : "w-1 h-1 bg-white/50")}
        />
      ))}
      {visibleRange.end < total - 1 && <div className="w-1 h-1 rounded-full bg-white/30" />}
    </div>
  );
});

const VideoPlaceholder = React.memo(function VideoPlaceholder({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  return (
    <div className="absolute inset-0 z-[1]">
      {coverUrl ? (
        <img src={coverUrl} alt={title} className="h-full w-full object-cover" loading="eager" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      )}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
});

const FeedRow = React.memo(function FeedRow({ 
  index, 
  style, 
  items, 
  activeIndex,
}: { 
  index: number; 
  style: React.CSSProperties;
  items: TikTokFeedItem[];
  activeIndex: number;
}) {
  const item = items[index];
  const isActive = index === activeIndex;
  const shouldPreload = Math.abs(index - activeIndex) <= 1;
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [showHeart, setShowHeart] = useState(false);
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showSaveParticles, setShowSaveParticles] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["event-comment-count", item.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("event_comments").select("*", { count: "exact", head: true }).eq("event_id", item.id);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000,
    enabled: isActive,
  });

  const isLive = useMemo(() => isEventLive(item.startAt, item.endAt), [item.startAt, item.endAt]);
  const shouldPlay = isActive && !isPaused && !videoError;
  const { isLiked, likeCount, isSaved, saveCount, toggleLike, toggleSave } = useEventEngagement(item.id);

  const eventDate = new Date(item.startAt);
  const formattedDate = format(eventDate, "d MMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");
  const formatPrice = (cents: number) => cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;

  // Optimized video autoplay - iOS compatible with smooth transitions and sound
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError || !item.videoUrl) return;
    
    if (shouldPlay) {
      // Use requestAnimationFrame for smoother start
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        
        videoRef.current.playbackRate = 1.0;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => { 
            if (err.name !== 'AbortError') {
              console.warn('Video autoplay failed:', err.name);
            }
          });
        }
      });
    } else {
      // Pause smoothly
      video.pause();
    }
  }, [shouldPlay, videoError, item.videoUrl]);

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

  return (
    <div 
      style={style} 
      className="snap-start snap-always" 
      onDoubleClick={handleDoubleTap} 
      onClick={() => item.videoUrl && !videoError && setIsPaused(p => !p)}
    >
      <div className="relative w-full h-full">
        {/* GPU-accelerated media container */}
        <div 
          className="absolute inset-0" 
          style={{ 
            contain: 'strict',
            transform: 'translateZ(0)',
            willChange: isActive ? 'auto' : 'transform',
          }}
        >
          {item.videoUrl && !videoError ? (
            <>
              {/* Cover image as instant background */}
              {item.coverImageUrl && (
                <img 
                  src={item.coverImageUrl} 
                  alt="" 
                  className="absolute inset-0 h-full w-full object-cover" 
                  loading="eager"
                  decoding="async"
                  aria-hidden="true"
                />
              )}
              {!videoLoaded && !item.coverImageUrl && <VideoPlaceholder coverUrl={null} title={item.title} />}
              <video 
                ref={videoRef} 
                src={isActive || shouldPreload ? item.videoUrl : undefined} 
                loop 
                playsInline
                webkit-playsinline="true"
                preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
                onLoadedData={() => { setVideoLoaded(true); setVideoError(false); }}
                onCanPlayThrough={() => { setVideoLoaded(true); }}
                onError={() => { setVideoError(true); setVideoLoaded(false); }}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  videoLoaded ? "opacity-100" : "opacity-0"
                )}
                style={{ 
                  transform: 'translate3d(0,0,0)',
                  WebkitTransform: 'translate3d(0,0,0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transition: 'opacity 0.4s ease-out',
                  objectFit: 'cover',
                }}
              />
            </>
          ) : item.coverImageUrl ? (
            <img 
              src={item.coverImageUrl} 
              alt={item.title} 
              className="absolute inset-0 h-full w-full object-cover" 
              loading={isActive || shouldPreload ? "eager" : "lazy"} 
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
        </div>

        <AnimatePresence>
          {showHeart && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative"><Heart className="h-24 w-24 text-accent fill-accent" /><LikeParticles show={showLikeParticles} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPaused && item.videoUrl && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right side action bar - TikTok style - positioned near navbar */}
        <div className="absolute right-3 z-10 flex flex-col items-center gap-4" style={{ bottom: 'calc(var(--app-bottom-offset, 72px) + 40px)' }}>
          {/* Organizer avatar with follow indicator */}
          <button 
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (item.organizerId) navigate(`/organizador/${item.organizerId}`); }}
            className="relative"
          >
            <div className="h-11 w-11 rounded-full border-2 border-white overflow-hidden">
              {item.organizerAvatar ? (
                <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
              <Plus className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </div>
          </button>

          {/* Like button */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center gap-0.5 relative">
            <div className="relative">
              <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                <Heart className={cn("h-6 w-6 transition-all", isLiked ? "fill-accent text-accent" : "text-white/90")} strokeWidth={1.5} />
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

        {/* Bottom event info - minimalist */}
        <div className="absolute bottom-0 left-0 right-16 p-3 pb-[calc(var(--app-bottom-offset,72px)+8px)] z-10">
          {/* Organizer */}
          <span className="text-white/70 text-xs font-medium block mb-0.5">
            {item.organizerName || "Organizador"}
          </span>
          
          {/* Title */}
          <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 mb-1.5">
            {item.title}
          </h3>
          
          {/* Date & location - single line */}
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

          {/* Buy ticket button - prominent CTA with visual differentiation */}
          {(() => {
            const isFree = (item.minPrice || 0) === 0;
            const IconComponent = isFree ? Gift : Ticket;
            return (
              <div className="flex items-center gap-2">
                {/* GRÁTIS Badge - only for free events */}
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
                  animate={{ 
                    boxShadow: isFree 
                      ? ["0 0 0 0 hsl(var(--success) / 0.3)", "0 0 0 4px hsl(var(--success) / 0)"]
                      : ["0 0 0 0 hsl(var(--primary) / 0.3)", "0 0 0 4px hsl(var(--primary) / 0)"]
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" }
                  }}
                  className="inline-block rounded-full"
                >
                  <Link 
                    to={`/evento/${item.id}`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFeedback({ haptic: "medium", sound: "tap" });
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg transition-colors",
                      isFree 
                        ? "bg-success text-success-foreground" 
                        : "bg-white text-foreground"
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{isFree ? "Participar" : "Comprar"}</span>
                    {!isFree && (
                      <span className="opacity-80">• {formatPrice(item.minPrice || 0)}</span>
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

export function TikTokFeed({ items, isLoading, onLoadMore, hasMore, isLoadingMore, scrollPosition = 0, onScrollChange, onRefresh }: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(() => {
    try {
      const cached = sessionStorage.getItem(SCROLL_POSITION_KEY);
      return cached ? parseInt(cached, 10) : 0;
    } catch { return 0; }
  });
  const lastScrollTop = useRef(0);
  const isScrolling = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const updateHeight = () => setContainerHeight(window.innerHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Save scroll position to cache
  useEffect(() => {
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, String(activeIndex));
      onScrollChange?.(activeIndex);
    } catch {}
  }, [activeIndex, onScrollChange]);

  // Track previous index to avoid redundant haptics
  const prevIndexRef = useRef(activeIndex);

  // Optimized scroll handler - throttled for performance
  const handleScrollRaw = useCallback(() => {
    const container = containerRef.current;
    if (!container || containerHeight === 0) return;

    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / containerHeight);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
      // Only trigger haptic when actually changing to a new index
      if (newIndex !== prevIndexRef.current) {
        prevIndexRef.current = newIndex;
        // Minimal haptic - only on actual snap, not during scroll
        requestAnimationFrame(() => {
          triggerFeedback({ haptic: "selection" });
        });
      }
      setActiveIndex(newIndex);
    }

    // Load more when approaching end
    if (newIndex >= items.length - 3 && hasMore && !isLoadingMore) {
      onLoadMore?.();
    }

    lastScrollTop.current = scrollTop;
  }, [containerHeight, activeIndex, items.length, hasMore, isLoadingMore, onLoadMore]);

  // Throttled version of scroll handler - 60fps max (16ms)
  const handleScroll = useMemo(
    () => throttle(handleScrollRaw, 16),
    [handleScrollRaw]
  );

  // Touch handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0 && !isRefreshing) {
      setPullDistance(Math.min(deltaY * 0.4, 80));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, isRefreshing]);

  // Restore scroll position on mount
  useEffect(() => {
    const container = containerRef.current;
    if (container && containerHeight > 0 && activeIndex > 0) {
      container.scrollTop = activeIndex * containerHeight;
    }
  }, [containerHeight]);

  // Keyboard navigation
  useEffect(() => {
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
  }, [activeIndex, containerHeight]);

  if (isLoading || containerHeight === 0) return <div style={{ height: containerHeight || '100dvh' }}><FeedSkeleton /></div>;

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
    <div className="relative" style={{ height: containerHeight }}>

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

      {/* Native scroll container with CSS snap - GPU accelerated */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full overflow-y-auto overscroll-y-contain scrollbar-hide"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)',
          willChange: 'scroll-position',
          contain: 'layout style paint',
        }}
      >
        {items.map((item, index) => {
          const isVisible = Math.abs(index - activeIndex) <= 2;
          
          return (
            <div
              key={item.id}
              style={{ height: containerHeight }}
              className="snap-start snap-always"
            >
              {isVisible ? (
                <FeedRow
                  index={index}
                  style={{ height: '100%' }}
                  items={items}
                  activeIndex={activeIndex}
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
