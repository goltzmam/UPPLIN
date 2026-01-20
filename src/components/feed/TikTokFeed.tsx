import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play, X } from "lucide-react";
import { format, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { ShareButton } from "@/components/events/ShareButton";
import { triggerFeedback } from "@/lib/feedback";
import { EventComments } from "@/components/events/EventComments";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeedSkeleton } from "./FeedSkeleton";

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

const MUTE_STORAGE_KEY = "upplin_feed_muted";
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

interface RowData {
  items: TikTokFeedItem[];
  activeIndex: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

const FeedRow = React.memo(function FeedRow({ 
  index, 
  style, 
  items, 
  activeIndex, 
  isMuted, 
  onToggleMute 
}: { 
  index: number; 
  style: React.CSSProperties;
  items: TikTokFeedItem[];
  activeIndex: number;
  isMuted: boolean;
  onToggleMute: () => void;
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

  // Video autoplay control - iOS requires muted + playsinline for autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;
    
    // Ensure video is muted before attempting autoplay (iOS requirement)
    video.muted = isMuted;
    
    if (shouldPlay) {
      // Small delay to ensure video element is ready
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => { 
          if (err.name !== 'AbortError') {
            console.warn('Video autoplay failed:', err.name);
            // Don't set error - just show the cover image
          }
        });
      }
    } else {
      video.pause();
    }
  }, [shouldPlay, videoError, isMuted]);

  useEffect(() => { 
    if (videoRef.current) {
      videoRef.current.muted = isMuted; 
    }
  }, [isMuted]);

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
    <div style={style} className="snap-start snap-always" onDoubleClick={handleDoubleTap} onClick={() => item.videoUrl && setIsPaused(p => !p)}>
      <div className="relative w-full h-full">
        <div className="absolute inset-0 will-change-transform" style={{ contain: 'strict' }}>
          {item.videoUrl && !videoError ? (
            <>
              {/* Always show cover as background for faster perceived load */}
              {item.coverImageUrl && (
                <img 
                  src={item.coverImageUrl} 
                  alt="" 
                  className="absolute inset-0 h-full w-full object-cover" 
                  loading="eager"
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
                x-webkit-airplay="deny"
                muted={isMuted}
                preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
                onLoadedData={() => { setVideoLoaded(true); setVideoError(false); }}
                onError={() => { setVideoError(true); setVideoLoaded(false); }}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                  videoLoaded ? "opacity-100" : "opacity-0"
                )}
                style={{ 
                  transform: 'translateZ(0)', 
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden'
                }}
              />
            </>
          ) : item.coverImageUrl ? (
            <img src={item.coverImageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" loading={isActive || shouldPreload ? "eager" : "lazy"} />
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

        <div className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] left-3 right-16 z-10">
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (item.organizerId) navigate(`/organizador/${item.organizerId}`); }}
              className="flex items-center gap-2 min-w-0">
              <div className="avatar-ring-gradient p-[2px] rounded-full shrink-0">
                <div className="h-9 w-9 rounded-full bg-muted overflow-hidden">
                  {item.organizerAvatar ? <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
                    : <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-xs font-bold">{item.organizerName?.[0] || "O"}</div>}
                </div>
              </div>
              <span className="text-white text-sm font-semibold drop-shadow-lg truncate">@{item.organizerName?.replace(/\s+/g, "").toLowerCase() || "organizador"}</span>
            </button>
            {isLive && <LiveBadge />}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 z-10">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-0 pr-4">
              <Link to={`/evento/${item.id}`} onClick={(e) => e.stopPropagation()} className="block">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("px-3 py-1 rounded-full text-xs font-bold", (item.minPrice || 0) === 0 ? "bg-green-500 text-white" : "bg-white text-black")}>{formatPrice(item.minPrice || 0)}</div>
                </div>
                <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2 mb-2">{item.title}</h3>
                <div className="flex flex-col gap-1.5 text-white/85 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" /><span>{formattedDate} • {formattedTime}</span></div>
                  {(item.venueName || item.addressText) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{item.venueName || item.addressText}</span></div>}
                </div>
              </Link>
            </div>

            <div className="flex flex-col items-center gap-4 shrink-0">
              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center gap-1 relative">
                <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 relative">
                  <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                    <Heart className={cn("h-5 w-5 transition-all", isLiked ? "fill-accent text-accent" : "text-white")} />
                  </motion.div>
                  <LikeParticles show={showLikeParticles && !showHeart} />
                </div>
                <span className="text-white text-[10px] font-semibold drop-shadow-lg">{formatEngagementCount(likeCount)}</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1">
                <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10"><MessageCircle className="h-5 w-5 text-white" /></div>
                <span className="text-white text-[10px] font-semibold drop-shadow-lg">{formatEngagementCount(commentCount)}</span>
              </motion.button>

              <ShareButton eventId={item.id} eventTitle={item.title} eventDate={formattedDate} eventImage={item.coverImageUrl} iconOnly
                className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10" />

              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleSaveClick(); }} className="flex flex-col items-center gap-1 relative">
                <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 relative">
                  <motion.div animate={{ scale: isSaved ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                    <Bookmark className={cn("h-5 w-5 transition-all", isSaved ? "fill-white text-white" : "text-white")} />
                  </motion.div>
                  <SaveParticles show={showSaveParticles} />
                </div>
                <span className="text-white text-[10px] font-semibold drop-shadow-lg">{formatEngagementCount(saveCount)}</span>
              </motion.button>

              {item.videoUrl && (
                <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="flex flex-col items-center">
                  <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                    {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                  </div>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <Drawer open={showComments} onOpenChange={setShowComments}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg font-semibold">Comentários</DrawerTitle>
                <button onClick={() => setShowComments(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4"><EventComments eventId={item.id} /></div>
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
    // Restore scroll position from cache
    try {
      const cached = sessionStorage.getItem(SCROLL_POSITION_KEY);
      return cached ? parseInt(cached, 10) : 0;
    } catch { return 0; }
  });
  const activeIndexRef = useRef(activeIndex);
  const isAnimating = useRef(false);

  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_STORAGE_KEY) === "true" || localStorage.getItem(MUTE_STORAGE_KEY) === null; } catch { return true; }
  });

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => { const v = !prev; try { localStorage.setItem(MUTE_STORAGE_KEY, String(v)); } catch {} return v; });
  }, []);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Motion value for smooth snap animation
  const y = useMotionValue(0);
  const ySmooth = useTransform(y, (value) => value);

  useEffect(() => {
    const updateHeight = () => setContainerHeight(window.innerHeight - 80);
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

  // Navigate to specific index with smooth animation
  const goToIndex = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    if (clampedIndex === activeIndexRef.current || isAnimating.current) return;
    
    isAnimating.current = true;
    triggerFeedback({ haptic: "light" });
    
    const targetY = -clampedIndex * containerHeight;
    animate(y, targetY, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      onComplete: () => {
        isAnimating.current = false;
        activeIndexRef.current = clampedIndex;
        setActiveIndex(clampedIndex);
        
        // Load more when approaching end
        if (clampedIndex >= items.length - 2 && hasMore && !isLoadingMore) {
          onLoadMore?.();
        }
      }
    });
  }, [y, containerHeight, items.length, hasMore, isLoadingMore, onLoadMore]);

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    const swipeThreshold = containerHeight * 0.2;
    const velocityThreshold = 300;
    
    let newIndex = activeIndexRef.current;
    
    if (offset < -swipeThreshold || velocity < -velocityThreshold) {
      // Swiped up - go to next
      newIndex = activeIndexRef.current + 1;
    } else if (offset > swipeThreshold || velocity > velocityThreshold) {
      // Swiped down - go to previous or pull to refresh
      if (activeIndexRef.current === 0 && offset > 80 && onRefresh && !isRefreshing) {
        setIsRefreshing(true);
        onRefresh().finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        });
      } else {
        newIndex = activeIndexRef.current - 1;
      }
    }
    
    goToIndex(newIndex);
    setPullDistance(0);
  }, [containerHeight, goToIndex, onRefresh, isRefreshing]);

  // Handle drag for pull-to-refresh indicator
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (activeIndexRef.current === 0 && info.offset.y > 0) {
      setPullDistance(Math.min(info.offset.y * 0.5, 80));
    }
  }, []);

  // Initialize y position based on active index
  useEffect(() => {
    if (containerHeight > 0 && items.length > 0) {
      y.set(-activeIndex * containerHeight);
    }
  }, [containerHeight, items.length, activeIndex, y]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToIndex(activeIndexRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToIndex(activeIndexRef.current - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToIndex]);

  if (isLoading || containerHeight === 0) return <div style={{ height: containerHeight || 'calc(100dvh - 80px)' }}><FeedSkeleton /></div>;

  if (items.length === 0) {
    return (
      <div style={{ height: containerHeight }} className="flex items-center justify-center text-center p-8 bg-background">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center"><Calendar className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-foreground font-medium mb-1">Nenhum evento encontrado</p>
          <p className="text-sm text-muted-foreground">Explore categorias ou siga organizadores</p>
        </div>
      </div>
    );
  }

  // Calculate visible range for performance (only render ±2 items)
  const visibleRange = {
    start: Math.max(0, activeIndex - 2),
    end: Math.min(items.length - 1, activeIndex + 2)
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden touch-pan-y"
      style={{ height: containerHeight }}
    >
      {/* Scroll mini map */}
      <div className="fixed z-30 pointer-events-none" style={{ top: "50%", right: "8px", transform: "translateY(-50%)" }}>
        <ScrollMiniMap current={activeIndex} total={items.length} />
      </div>

      {/* Pull to refresh indicator */}
      {onRefresh && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center z-20" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className={cn("mt-2 rounded-full bg-background/80 backdrop-blur px-3 py-1.5 border border-border/50 transition-opacity", pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0")}
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

      {/* Feed container with gesture handling */}
      <motion.div
        style={{ y: ySmooth }}
        drag="y"
        dragConstraints={{ top: -(items.length - 1) * containerHeight, bottom: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="will-change-transform"
      >
        {items.map((item, index) => {
          // Only render items in visible range for performance
          const isInRange = index >= visibleRange.start && index <= visibleRange.end;
          
          return (
            <div
              key={item.id}
              style={{ 
                height: containerHeight,
                visibility: isInRange ? 'visible' : 'hidden'
              }}
              className="snap-start snap-always"
            >
              {isInRange && (
                <FeedRow
                  index={index}
                  style={{ height: '100%' }}
                  items={items}
                  activeIndex={activeIndex}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                />
              )}
            </div>
          );
        })}
      </motion.div>

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
