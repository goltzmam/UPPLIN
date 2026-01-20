import { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  minPrice?: number;
}

interface TikTokFeedProps {
  items: TikTokFeedItem[];
  isLoading?: boolean;
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
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
      setIsLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
    }
  };

  const handleTap = () => {
    if (item.videoUrl) {
      setIsPaused(!isPaused);
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
            <Heart className="h-32 w-32 text-accent fill-accent" />
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
            <div className="h-20 w-20 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <Play className="h-10 w-10 text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top - Organizer info */}
      <div className="absolute top-4 left-4 right-16 flex items-center gap-3 z-10">
        <Link 
          to={`/evento/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          <div className="avatar-ring-gradient p-[2px] rounded-full">
            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
              {item.organizerAvatar ? (
                <img src={item.organizerAvatar} alt={item.organizerName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
          </div>
          <span className="text-white text-sm font-semibold drop-shadow-lg">
            {item.organizerName || "Organizador"}
          </span>
        </Link>
      </div>

      {/* Price badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className={cn(
            "text-sm font-bold",
            (item.minPrice || 0) === 0 ? "text-green-600" : "text-foreground"
          )}>
            {formatPrice(item.minPrice || 0)}
          </span>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-16 p-4 z-10">
        <Link 
          to={`/evento/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-2 mb-2">
            {item.title}
          </h3>
          
          <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate} • {formattedTime}</span>
            </div>
            {(item.venueName || item.addressText) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{item.venueName || item.addressText}</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Right side actions */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 z-10">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className={cn("h-6 w-6 text-white", isLiked && "fill-accent text-accent")} />
          </div>
          <span className="text-white text-xs font-medium">1.2k</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">234</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Bookmark className={cn("h-6 w-6 text-white", isSaved && "fill-white")} />
          </div>
          <span className="text-white text-xs font-medium">Salvar</span>
        </motion.button>

        {item.videoUrl && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              {isMuted ? (
                <VolumeX className="h-6 w-6 text-white" />
              ) : (
                <Volume2 className="h-6 w-6 text-white" />
              )}
            </div>
          </motion.button>
        )}
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
