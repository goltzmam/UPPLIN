import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Volume2, VolumeX, Loader2 } from "lucide-react";
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

// Lightweight video cache to prevent reloading
const videoCache = new Map<string, boolean>();
const MAX_CACHE_SIZE = 10;

function addToCache(url: string) {
  if (videoCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = videoCache.keys().next().value;
    if (firstKey) videoCache.delete(firstKey);
  }
  videoCache.set(url, true);
}

function isInCache(url: string): boolean {
  return videoCache.has(url);
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
  const [videoLoaded, setVideoLoaded] = useState(() => isInCache(videoUrl));
  const [videoError, setVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const playAttemptRef = useRef<number>(0);

  const shouldPlay = isActive && !isPaused && !videoError;

  // Optimized iOS autoplay with retry logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;

    // Always keep muted for iOS autoplay compliance
    video.muted = isMuted;
    
    if (shouldPlay) {
      const attemptId = ++playAttemptRef.current;
      
      // iOS requires a small delay after becoming visible
      const playWithRetry = async () => {
        if (playAttemptRef.current !== attemptId) return;
        
        try {
          // Ensure video is ready
          if (video.readyState < 2) {
            video.load();
            await new Promise(resolve => {
              const onCanPlay = () => {
                video.removeEventListener('canplay', onCanPlay);
                resolve(undefined);
              };
              video.addEventListener('canplay', onCanPlay);
              // Timeout fallback
              setTimeout(resolve, 1000);
            });
          }
          
          if (playAttemptRef.current !== attemptId) return;
          
          // Force muted for autoplay (iOS requirement)
          video.muted = true;
          video.playbackRate = 1.0;
          
          await video.play();
          
          // After successful play, sync mute state
          if (!isMuted) {
            // Small delay before unmuting (iOS workaround)
            setTimeout(() => {
              if (videoRef.current && playAttemptRef.current === attemptId) {
                videoRef.current.muted = isMuted;
              }
            }, 100);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('Video autoplay failed:', err.name);
          // Don't set error - keep showing cover
        }
      };
      
      // Immediate attempt for cached videos, delayed for fresh loads
      const delay = isInCache(videoUrl) ? 0 : 50;
      setTimeout(playWithRetry, delay);
    } else {
      video.pause();
    }
    
    return () => {
      playAttemptRef.current++;
    };
  }, [shouldPlay, videoError, isMuted, videoUrl]);

  // Sync mute state when toggled
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Buffering detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (videoError) return;
    
    setIsPaused((p) => {
      const newPaused = !p;
      setShowPauseIcon(true);
      setTimeout(() => setShowPauseIcon(false), 800);
      return newPaused;
    });
  }, [videoError]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setVideoLoaded(false);
    setIsBuffering(false);
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
    setIsBuffering(false);
    addToCache(videoUrl);
  }, [videoUrl]);

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
      {/* Cover image as instant background - always show initially */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out",
            videoLoaded && !isBuffering ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Minimal loading indicator - only when no cover */}
      {!videoLoaded && !coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Video element - optimized for iOS */}
      <video
        ref={videoRef}
        src={isActive ? videoUrl : undefined}
        loop
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="deny"
        disableRemotePlayback
        muted={isMuted}
        preload={isActive ? "auto" : "metadata"}
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: 'opacity 0.5s ease-out',
          // iOS optimizations
          WebkitTransform: 'translate3d(0,0,0)',
          objectFit: 'cover',
        }}
      />

      {/* Smooth buffering indicator overlay */}
      <AnimatePresence>
        {isBuffering && videoLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"
          >
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause/Play overlay with smooth animation */}
      <AnimatePresence mode="wait">
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
          >
            <motion.div 
              className="h-20 w-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Play className="h-10 w-10 text-white ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap feedback - brief pause icon flash */}
      <AnimatePresence>
        {showPauseIcon && !isPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute button - larger touch target for mobile */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="absolute top-4 right-4 z-20 h-11 w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
        whileTap={{ scale: 0.9 }}
        aria-label={isMuted ? "Ativar som" : "Desativar som"}
      >
        <AnimatePresence mode="wait">
          {isMuted ? (
            <motion.div
              key="muted"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <VolumeX className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="unmuted"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <Volume2 className="h-5 w-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
});
