import { Link } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Share2, Bookmark, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FeedEventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  coverImageUrl: string | null;
  startAt: string;
  venueName: string | null;
  addressText: string | null;
  organizerName?: string;
  organizerAvatar?: string | null;
  minPrice?: number;
  index?: number;
}

export function FeedEventCard({
  id,
  slug,
  title,
  coverImageUrl,
  startAt,
  venueName,
  addressText,
  organizerName = "Organizador",
  organizerAvatar,
  minPrice = 0,
  index = 0,
}: FeedEventCardProps) {
  const eventUrl = `/evento/${slug || id}`;
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  const eventDate = new Date(startAt);
  const formattedDate = format(eventDate, "d MMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(0)}`;
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="feed-card group"
      onDoubleClick={handleDoubleTap}
    >
      <Link to={eventUrl} className="block h-full">
        {/* Cover Image */}
        <div className="absolute inset-0">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Double tap heart animation - gradient */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart className="h-24 w-24 heart-animation" style={{ color: '#FF2D2D', fill: '#FF2D2D' }} />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>

        {/* Top - Organizer info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="avatar-ring-gradient">
              <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                {organizerAvatar ? (
                  <img src={organizerAvatar} alt={organizerName} className="h-full w-full object-cover" />
                ) : (
                  <div 
                    className="h-full w-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
                  >
                    {organizerName[0]}
                  </div>
                )}
              </div>
            </div>
            <span className="text-white text-sm font-medium drop-shadow-lg">{organizerName}</span>
          </div>
          
          {/* Price badge */}
          <div className={cn(
            "rounded-full border px-3 py-1 shadow-soft backdrop-blur-md",
            minPrice === 0
              ? "border-primary/30 bg-primary text-primary-foreground"
              : "border-border/80 bg-background/90 text-foreground"
          )}>
            <span className={cn(
              "text-sm font-bold drop-shadow-sm",
              minPrice === 0 ? "text-primary-foreground" : "text-foreground"
            )}>
              {formatPrice(minPrice)}
            </span>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-end justify-between gap-4">
            {/* Event info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight line-clamp-2 mb-2">
                {title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-2 text-white/80 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate} • {formattedTime}</span>
                </div>
                {(venueName || addressText) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[150px]">{venueName || addressText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social actions - vertical stack */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.preventDefault();
                  setIsLiked(!isLiked);
                }}
                className="social-btn h-10 w-10 bg-black/30 backdrop-blur-sm text-white"
              >
                <Heart 
                  className={cn("h-6 w-6", isLiked ? "" : "text-white")} 
                  style={isLiked ? { color: '#FF2D2D', fill: '#FF2D2D' } : undefined}
                />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => e.preventDefault()}
                className="social-btn h-10 w-10 bg-black/30 backdrop-blur-sm text-white"
              >
                <MessageCircle className="h-6 w-6" />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => e.preventDefault()}
                className="social-btn h-10 w-10 bg-black/30 backdrop-blur-sm text-white"
              >
                <Share2 className="h-6 w-6" />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.preventDefault();
                  setIsSaved(!isSaved);
                }}
                className="social-btn h-10 w-10 bg-black/30 backdrop-blur-sm text-white"
              >
                <Bookmark className={cn("h-6 w-6", isSaved && "fill-white")} />
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
