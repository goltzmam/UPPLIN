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
import { FeedVideoPlayer } from "./FeedVideoPlayer";

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
          <Heart className="w-full h-full" style={{ color: '#FF2D2D', fill: '#FF2D2D' }} />
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
  const navigate = useNavigate();
  const [showHeart, setShowHeart] = useState(false);
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showSaveParticles, setShowSaveParticles] = useState(false);
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
  const { isLiked, likeCount, isSaved, toggleLike, toggleSave } = useEventEngagement(item.id);

  const eventDate = new Date(item.startAt);
  const formattedDate = format(eventDate, "d MMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");
  const formatPrice = (cents: number) => cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;

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
    <div style={style} className="snap-start snap-always" onDoubleClick={handleDoubleTap}>
      <div className="relative w-full h-full overflow-hidden">
        {/* Media container - uses FeedVideoPlayer for video or shows cover image */}
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
              className="absolute inset-0 w-full h-full object-cover" 
              loading={isActive ? "eager" : "lazy"} 
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none" />
        </div>

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
        <div className="absolute right-3 z-10 flex flex-col items-center gap-4" style={{ bottom: 'calc(var(--app-bottom-offset, 100px) + 100px)' }}>
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
                    to={`/evento/${item.id}`} 
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

export function TikTokFeed({ items, isLoading, onLoadMore, hasMore, isLoadingMore, scrollPosition = 0, onScrollChange, onRefresh }: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [containerHeight, setContainerHeight] = useState(0);
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

  // Measure container height
  useEffect(() => {
    const updateHeight = () => setContainerHeight(window.innerHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // IntersectionObserver for active item detection (replaces scroll handler)
  useEffect(() => {
    if (containerHeight === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            if (index !== activeIndex) {
              // Only trigger haptic on actual index change
              if (index !== prevIndexRef.current) {
                prevIndexRef.current = index;
                triggerFeedback({ haptic: "selection" });
              }
              setActiveIndex(index);
            }
          }
        });
      },
      { 
        root: containerRef.current,
        threshold: 0.7 
      }
    );

    // Observe all items
    itemRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [containerHeight, items.length, activeIndex]);

  // Save scroll position to cache
  useEffect(() => {
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, String(activeIndex));
      onScrollChange?.(activeIndex);
    } catch {}
  }, [activeIndex, onScrollChange]);

  // Detect scrolling state (for pausing videos during scroll)
  const handleScroll = useCallback(() => {
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
  }, [containerHeight, items.length, hasMore, isLoadingMore, onLoadMore]);

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item, index) => {
          const isVisible = Math.abs(index - activeIndex) <= 2;
          
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
              {isVisible ? (
                <FeedRow
                  index={index}
                  style={{ height: '100%' }}
                  items={items}
                  activeIndex={activeIndex}
                  isScrolling={isScrolling}
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
