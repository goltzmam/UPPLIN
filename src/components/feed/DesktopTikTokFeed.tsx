import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Play, X, Plus, Ticket } from "lucide-react";
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
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import { FeedSkeleton } from "./FeedSkeleton";
import { stopAllMediaPipelines } from "@/lib/media";

interface FeedItem {
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

interface DesktopTikTokFeedProps {
  items: FeedItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onRefresh?: () => Promise<void>;
  /** When false, the feed stays mounted but MUST NOT keep playing audio/video. */
  isVisible?: boolean;
}

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

const FeedCard = React.memo(function FeedCard({ 
  item, 
  isActive,
  index,
}: { 
  item: FeedItem; 
  isActive: boolean;
  index: number;
}) {
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
    <>
      <div 
        className="relative w-full h-full snap-start snap-always"
        onDoubleClick={handleDoubleTap}
      >
        {/* Video/Image - Full screen coverage */}
        {item.videoUrl ? (
          <FeedVideoPlayer
            videoUrl={item.videoUrl}
            coverUrl={item.coverImageUrl}
            isActive={isActive}
            className="w-full h-full"
          />
        ) : item.coverImageUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={item.coverImageUrl} 
              alt={item.title} 
              className="w-full h-full object-cover" 
              loading={isActive ? "eager" : "lazy"} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-black" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Double tap heart */}
        <AnimatePresence>
          {showHeart && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }} 
              animate={{ scale: 1.2, opacity: 1 }} 
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="relative">
                <Heart className="h-24 w-24" style={{ color: '#FF2D2D', fill: '#FF2D2D' }} />
                <LikeParticles show={showLikeParticles} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live badge */}
        {isLive && (
          <div className="absolute top-4 left-4 z-10">
            <LiveBadge />
          </div>
        )}

        {/* Right side action bar */}
        <div className="absolute right-4 bottom-32 z-10 flex flex-col items-center gap-5">
          {/* Organizer avatar */}
          <button 
            onClick={(e) => { e.stopPropagation(); if (item.organizerId) navigate(`/organizador/${item.organizerId}`); }}
            className="relative"
          >
            <div className="h-12 w-12 rounded-full border-2 border-white overflow-hidden">
              {item.organizerAvatar ? (
                <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}>
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}>
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          </button>

          {/* Like */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center gap-1 relative">
            <div className="relative">
              <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                <Heart className={cn("h-7 w-7 transition-all", isLiked ? "" : "text-white")} strokeWidth={1.5} style={isLiked ? { color: '#FF2D2D', fill: '#FF2D2D' } : undefined} />
              </motion.div>
              <LikeParticles show={showLikeParticles && !showHeart} />
            </div>
            <span className="text-white text-xs font-medium">{formatEngagementCount(likeCount)}</span>
          </motion.button>

          {/* Comments */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7 text-white" strokeWidth={1.5} />
            <span className="text-white text-xs font-medium">{formatEngagementCount(commentCount)}</span>
          </motion.button>

          {/* Bookmark */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); handleSaveClick(); }} className="flex flex-col items-center gap-1">
            <motion.div animate={{ scale: isSaved ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
              <Bookmark className={cn("h-7 w-7 transition-all", isSaved ? "fill-white text-white" : "text-white")} strokeWidth={1.5} />
            </motion.div>
          </motion.button>

          {/* Share */}
          <ShareButton eventId={item.id} eventTitle={item.title} iconOnly className="h-7 w-7 text-white" />
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 right-20 bottom-8 z-10">
          <Link 
            to={`/organizador/${item.organizerId}`}
            className="text-white font-semibold text-sm mb-1 flex items-center gap-1 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            @{item.organizerSlug || item.organizerName?.toLowerCase().replace(/\s+/g, '')}
          </Link>
          
          <Link 
            to={`/evento/${item.slug || item.id}`}
            className="block"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2 hover:underline">
              {item.title}
            </h2>
          </Link>

          <div className="flex items-center gap-3 text-white/80 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate} • {formattedTime}
            </span>
            {item.venueName && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.venueName}</span>
              </span>
            )}
          </div>

          {/* Buy button - brand gradient */}
          <Link
            to={`/evento/${item.slug || item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-full text-sm text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
            }}
          >
            <Ticket className="h-4 w-4" />
            Comprar • {formatPrice(item.minPrice || 0)}
          </Link>
        </div>
      </div>

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="max-h-[85vh] bg-background">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comentários
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <EventComments eventId={item.id} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
});

export function DesktopTikTokFeed({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isVisible = true,
}: DesktopTikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) stopAllMediaPipelines();
  }, [isVisible]);

  // Scroll-based active detection
  useEffect(() => {
    const container = containerRef.current;
    if (!isVisible || !container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
        setActiveIndex(newIndex);
        triggerFeedback({ haptic: "selection" });
      }

      // Load more when near end
      if (hasMore && !isLoadingMore && scrollTop + itemHeight * 2 >= container.scrollHeight) {
        onLoadMore?.();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, items.length, hasMore, isLoadingMore, onLoadMore, isVisible]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <FeedSkeleton />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory bg-background scrollbar-hide"
      style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="h-full w-full snap-start snap-always"
        >
          <FeedCard
            item={item}
            isActive={isVisible && index === activeIndex}
            index={index}
          />
        </div>
      ))}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="h-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
