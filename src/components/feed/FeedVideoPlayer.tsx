import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeedVideoPlayerProps {
  videoUrl: string;
  coverUrl: string | null;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  className?: string;
}

export const FeedVideoPlayer = React.memo(function FeedVideoPlayer({
  videoUrl,
  coverUrl,
  isActive,
  isMuted,
  onToggleMute,
  className,
}: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const shouldPlay = isActive && !isPaused && !videoError;

  // Video autoplay control
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;

    video.muted = isMuted;

    if (shouldPlay) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Video autoplay failed:", err.name);
            // Show cover on autoplay failure
            setVideoError(true);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [shouldPlay, videoError, isMuted]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleClick = useCallback(() => {
    if (videoError) return;
    
    setIsPaused((p) => {
      const newPaused = !p;
      setShowPlayIcon(newPaused);
      if (newPaused) {
        setTimeout(() => setShowPlayIcon(false), 1000);
      }
      return newPaused;
    });
  }, [videoError]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setVideoLoaded(false);
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
  }, []);

  // If video fails, show cover image as fallback
  if (videoError) {
    return (
      <div className={cn("absolute inset-0", className)}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0", className)} onClick={handleClick}>
      {/* Cover image as background/fallback */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            videoLoaded ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Loading spinner when video is loading */}
      {!videoLoaded && !coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={isActive ? videoUrl : undefined}
        loop
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload={isActive ? "auto" : "none"}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      />

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
          >
            <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-white" />
        ) : (
          <Volume2 className="h-4 w-4 text-white" />
        )}
      </button>
    </div>
  );
});
