import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Heart,
  MessageCircle,
  Bookmark,
  Play,
  Volume2,
  VolumeX,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventEngagement } from "@/hooks/use-event-engagement";
import { triggerFeedback } from "@/lib/feedback";
import { EventComments } from "@/components/events/EventComments";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/events/ShareButton";

interface FeedItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  videoUrl?: string | null;
  startAt: string;
  endAt?: string | null;
  venueName: string | null;
  addressText?: string | null;
  organizerName?: string;
  organizerSlug?: string | null;
  organizerAvatar?: string | null;
  organizerId?: string | null;
  minPrice?: number;
}

interface DesktopFeedCardProps {
  item: FeedItem;
  index: number;
  globalMuted: boolean;
  onToggleGlobalMute: () => void;
}

function formatEngagementCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

const LikeParticles = React.memo(function LikeParticles({ show }: { show: boolean }) {
  const particles = React.useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        angle: i * 45 + Math.random() * 20,
        distance: 40 + Math.random() * 25,
        size: 6 + Math.random() * 4,
        delay: Math.random() * 0.1,
      })),
    []
  );

  return (
    <AnimatePresence>
      {show &&
        particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1, 0.5],
              x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
              y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: p.delay, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{ width: p.size, height: p.size }}
          >
            <Heart className="w-full h-full text-accent fill-accent" />
          </motion.div>
        ))}
    </AnimatePresence>
  );
});

export const DesktopFeedCard = React.memo(function DesktopFeedCard({
  item,
  index,
  globalMuted,
  onToggleGlobalMute,
}: DesktopFeedCardProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const { isLiked, likeCount, isSaved, saveCount, toggleLike, toggleSave } =
    useEventEngagement(item.id);

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["event-comment-count", item.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_comments")
        .select("*", { count: "exact", head: true })
        .eq("event_id", item.id);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000,
  });

  const eventDate = new Date(item.startAt);
  const formattedDate = format(eventDate, "d 'de' MMMM", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");
  const formatPrice = (cents: number) =>
    cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;

  // Play/pause video on hover
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) return;

    video.muted = globalMuted;

    if (isHovered && videoLoaded) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovered, videoLoaded, item.videoUrl, globalMuted]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = globalMuted;
    }
  }, [globalMuted]);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      triggerFeedback({ haptic: "selection", sound: "tap" });
      toggleLike();
      setShowBigHeart(true);
      setShowLikeParticles(true);
      setTimeout(() => setShowBigHeart(false), 600);
      setTimeout(() => setShowLikeParticles(false), 700);
    }
  }, [isLiked, toggleLike]);

  const handleLikeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      triggerFeedback({ haptic: "light", sound: "tap" });
      if (!isLiked) {
        setShowLikeParticles(true);
        setTimeout(() => setShowLikeParticles(false), 700);
      }
      toggleLike();
    },
    [isLiked, toggleLike]
  );

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      triggerFeedback({ haptic: "light", sound: "tap" });
      toggleSave();
    },
    [toggleSave]
  );

  return (
    <>
      <motion.article
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className="p-4"
        onDoubleClick={handleDoubleTap}
      >
        {/* Organizer Header */}
        <div className="flex items-center justify-between mb-3">
          <Link
            to={`/organizador/${item.organizerId}`}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden ring-2 ring-border group-hover:ring-primary transition-colors">
              {item.organizerAvatar ? (
                <img
                  src={item.organizerAvatar}
                  alt={item.organizerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {item.organizerName?.[0] || "O"}
                </div>
              )}
            </div>
            <div>
              <span className="font-semibold text-sm group-hover:text-primary transition-colors block">
                {item.organizerName || "Organizador"}
              </span>
              <span className="text-xs text-muted-foreground">
                @{item.organizerSlug || item.organizerName?.replace(/\s+/g, "").toLowerCase()}
              </span>
            </div>
          </Link>
        </div>

        {/* Media Container */}
        <div
          className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted mb-3 cursor-pointer group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => navigate(`/evento/${item.id}`)}
        >
          {/* Fallback background gradient when no image */}
          {!item.coverImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
          )}
          
          {/* Cover Image - Always visible, only fade when video is playing */}
          {item.coverImageUrl && (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                // Hide broken image and show gradient fallback
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          {/* Video */}
          {item.videoUrl && (
            <video
              ref={videoRef}
              src={item.videoUrl}
              muted={globalMuted}
              loop
              playsInline
              webkit-playsinline="true"
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
              onCanPlay={() => setVideoLoaded(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                isHovered && videoLoaded ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
              }}
            />
          )}

          {/* Gradient Overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold text-white">{formattedDate}</span>
            </div>
            <div
              className={cn(
                "px-3 py-1.5 rounded-full backdrop-blur-md border",
                (item.minPrice || 0) === 0
                  ? "bg-success/30 border-success/40 text-success"
                  : "bg-black/60 border-white/10 text-white"
              )}
            >
              <span className="text-xs font-bold">{formatPrice(item.minPrice || 0)}</span>
            </div>
          </div>

          {/* Play Indicator (when not hovered) */}
          {item.videoUrl && !isHovered && (
            <div className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          )}

          {/* Volume Control (visible on hover) */}
          {item.videoUrl && isHovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleGlobalMute();
              }}
              className="absolute top-3 right-20 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors z-10"
            >
              {globalMuted ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </motion.button>
          )}

          {/* Big Heart on Double Tap */}
          <AnimatePresence>
            {showBigHeart && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <div className="relative">
                  <Heart className="h-24 w-24 text-accent fill-accent drop-shadow-lg" />
                  <LikeParticles show={showLikeParticles} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover Actions Sidebar */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute right-3 bottom-16 flex flex-col items-center gap-3 z-10"
              >
                {/* Like Button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleLikeClick}
                  className="flex flex-col items-center gap-1 relative"
                >
                  <div className="h-11 w-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors">
                    <motion.div
                      animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5 transition-all",
                          isLiked ? "fill-accent text-accent" : "text-white"
                        )}
                      />
                    </motion.div>
                    <LikeParticles show={showLikeParticles && !showBigHeart} />
                  </div>
                  <span className="text-white text-[10px] font-semibold drop-shadow-lg">
                    {formatEngagementCount(likeCount)}
                  </span>
                </motion.button>

                {/* Comment Button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="h-11 w-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-semibold drop-shadow-lg">
                    {formatEngagementCount(commentCount)}
                  </span>
                </motion.button>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleSaveClick}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="h-11 w-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors">
                    <motion.div
                      animate={{ scale: isSaved ? [1, 1.15, 1] : 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Bookmark
                        className={cn(
                          "h-5 w-5 transition-all",
                          isSaved ? "fill-white text-white" : "text-white"
                        )}
                      />
                    </motion.div>
                  </div>
                  <span className="text-white text-[10px] font-semibold drop-shadow-lg">
                    {formatEngagementCount(saveCount)}
                  </span>
                </motion.button>

                {/* Share Button */}
                <div className="h-11 w-11 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors">
                  <ShareButton
                    eventId={item.id}
                    eventTitle={item.title}
                    iconOnly
                    className="text-white"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Event Info */}
        <Link to={`/evento/${item.id}`} className="block group">
          <h3 className="font-display text-lg font-bold leading-tight mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formattedDate} • {formattedTime}
            </span>
            {item.venueName && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                {item.venueName}
              </span>
            )}
          </div>
        </Link>

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLikeClick}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-all",
                  isLiked ? "fill-accent text-accent" : ""
                )}
              />
              <span>{formatEngagementCount(likeCount)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(true);
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{formatEngagementCount(commentCount)}</span>
            </button>
            <button
              onClick={handleSaveClick}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bookmark
                className={cn(
                  "h-5 w-5 transition-all",
                  isSaved ? "fill-foreground" : ""
                )}
              />
              <span>{formatEngagementCount(saveCount)}</span>
            </button>
          </div>
          <ShareButton
            eventId={item.id}
            eventTitle={item.title}
            className="text-muted-foreground hover:text-foreground"
          />
        </div>
      </motion.article>

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="max-h-[85vh]">
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
