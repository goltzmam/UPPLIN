import { useRef, useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { ShareButton } from "@/components/events/ShareButton";

interface TikTokFeedItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  videoUrl?: string | null;
  startAt: string;
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
}

function formatEngagementCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
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
      className="relative h-full w-full snap-start snap-always"
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

      {/* Top - Organizer info */}
      <div className="absolute top-4 left-3 right-20 flex items-center gap-2 z-10">
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
      </div>

      {/* Price badge */}
      <div className="absolute top-4 right-3 z-10">
        <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <span className={cn(
            "text-xs font-bold",
            (item.minPrice || 0) === 0 ? "text-green-600" : "text-foreground"
          )}>
            {formatPrice(item.minPrice || 0)}
          </span>
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

export function TikTokFeed({ items, isLoading }: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Handle scroll to detect active item
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] bg-muted animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center text-center p-8">
        <div>
          <p className="text-muted-foreground mb-2">Nenhum evento encontrado</p>
          <p className="text-sm text-muted-foreground/70">
            Explore categorias ou siga organizadores
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-120px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {items.map((item, index) => (
        <div key={item.id} className="h-full w-full">
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
          />
        </div>
      ))}
    </div>
  );
}
