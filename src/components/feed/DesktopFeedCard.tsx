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
  Pause,
  Volume2,
  VolumeX,
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
  slug?: string | null;
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

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
  const eventUrl = `/evento/${item.slug || item.id}`;

  // IntersectionObserver to detect when card leaves viewport → stop video
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (!visible && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.muted = true;
          setIsPlaying(false);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Click-to-play/pause video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) return;

    video.muted = globalMuted;

    if (isPlaying && videoLoaded && isVisible) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, videoLoaded, item.videoUrl, globalMuted, isVisible]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = globalMuted;
    }
  }, [globalMuted]);

  // Cleanup on unmount - full hard stop
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.muted = true;
        video.volume = 0;
        video.removeAttribute("src");
        video.load();
      }
    };
  }, []);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.videoUrl || !videoLoaded) return;
    setIsPlaying((prev) => !prev);
    triggerFeedback({ haptic: "light" });
  }, [item.videoUrl, videoLoaded]);

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
        transition={{ delay: index * 0.03, duration: 0.3 }}
        className="pb-4 mb-4 border-b border-border/30"
        onDoubleClick={handleDoubleTap}
      >
        {/* Organizer Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <Link
            to={`/organizador/${item.organizerId}`}
            className="flex items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent via-pink-500 to-purple-600 p-0.5">
              <div className="h-full w-full rounded-full bg-background overflow-hidden">
                {item.organizerAvatar ? (
                  <img
                    src={item.organizerAvatar}
                    alt={item.organizerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center text-xs font-bold">
                    {item.organizerName?.[0] || "O"}
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-sm group-hover:text-primary transition-colors block leading-tight">
                {item.organizerName || "Organizador"}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.venueName || item.addressText}
              </span>
            </div>
          </Link>
        </div>

        {/* Media Container */}
        <div
          className="relative aspect-square rounded-sm overflow-hidden bg-muted cursor-pointer group"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onClick={handleVideoClick}
        >
          {/* Fallback background gradient when no image */}
          {!item.coverImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
          )}
          
          {/* Cover Image */}
          {item.coverImageUrl && (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                isPlaying && videoLoaded ? "opacity-0" : "opacity-100"
              )}
              loading="lazy"
              onError={(e) => {
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
                isPlaying && videoLoaded ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
              }}
            />
          )}

          {/* Play/Pause Overlay */}
          {item.videoUrl && videoLoaded && (
            <AnimatePresence>
              {(showControls || !isPlaying) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "h-16 w-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20",
                      isPlaying && "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="h-7 w-7 text-white" />
                    ) : (
                      <Play className="h-7 w-7 text-white ml-1" />
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Volume Control */}
          {item.videoUrl && isPlaying && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleGlobalMute();
              }}
              className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors z-10"
            >
              {globalMuted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
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
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleLikeClick}
              className="relative"
            >
              <motion.div
                animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-all",
                    isLiked ? "fill-accent text-accent" : "hover:text-muted-foreground/80"
                  )}
                />
              </motion.div>
              <LikeParticles show={showLikeParticles && !showBigHeart} />
            </motion.button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(true);
              }}
              className="hover:text-muted-foreground/80 transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <ShareButton
              eventId={item.id}
              eventTitle={item.title}
              iconOnly
              className="h-6 w-6 hover:text-muted-foreground/80"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSaveClick}
          >
            <motion.div
              animate={{ scale: isSaved ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.25 }}
            >
              <Bookmark
                className={cn(
                  "h-6 w-6 transition-all",
                  isSaved ? "fill-foreground" : "hover:text-muted-foreground/80"
                )}
              />
            </motion.div>
          </motion.button>
        </div>

        {/* Engagement Count */}
        <div className="mt-2 px-1">
          <span className="text-sm font-semibold">
            {formatEngagementCount(likeCount)} curtidas
          </span>
        </div>

        <div className="mt-1 px-1">
          <Link to={eventUrl} className="group">
            <span className="font-semibold text-sm mr-1.5 group-hover:text-primary transition-colors">
              {item.organizerName}
            </span>
            <span className="text-sm">{item.title}</span>
          </Link>
        </div>

        {/* Comments Preview */}
        {commentCount > 0 && (
          <button
            onClick={() => setShowComments(true)}
            className="mt-1 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos os {commentCount} comentários
          </button>
        )}

        {/* Date/Time */}
        <div className="mt-1 px-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate} às {formattedTime}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-semibold",
            (item.minPrice || 0) === 0
              ? "bg-success/20 text-success"
              : "bg-muted text-foreground"
          )}>
            {formatPrice(item.minPrice || 0)}
          </span>
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
