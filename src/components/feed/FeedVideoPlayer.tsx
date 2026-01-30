import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeedVideoPlayerProps {
  videoUrl: string;
  coverUrl: string | null;
  isActive: boolean;
  className?: string;
}

// Lightweight video cache to prevent reloading
const videoCache = new Map<string, boolean>();
const MAX_CACHE_SIZE = 10;

function addToCache(url: string) {
  if (videoCache.size >= MAX_CACHE_SIZE) {
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

  // Hard stop function to completely kill video playback and audio
  const hardStop = useCallback((video: HTMLVideoElement) => {
    try {
      video.pause();
      video.muted = true;
      video.volume = 0;
      video.currentTime = 0;
      // Force teardown of decoders/audio pipeline
      video.removeAttribute("src");
      video.load();
    } catch {
      // ignore
    }
  }, []);

  // Effect to manage play/pause state based on isActive and isPaused
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // CRITICAL: Always hard-stop when not active to prevent audio leaks
    if (!isActive) {
      playAttemptRef.current++;
      hardStop(video);
      return;
    }
    
    // Video is active but user paused - stop playback but keep loaded
    if (isPaused) {
      playAttemptRef.current++;
      video.pause();
      video.muted = true;
      video.volume = 0;
      return;
    }
    
    // Video should play
    if (shouldPlay && !videoError) {
      const attemptId = ++playAttemptRef.current;
      
      // Restore src if it was removed
      if (!video.src || video.src === '') {
        video.src = videoUrl;
      }
      
      const playWithRetry = async () => {
        if (playAttemptRef.current !== attemptId) return;
        
        try {
          // Only the active video is allowed to have audio
          video.muted = false;
          video.volume = 1;

          if (video.readyState < 2) {
            video.load();
            await new Promise(resolve => {
              const onCanPlay = () => {
                video.removeEventListener('canplay', onCanPlay);
                resolve(undefined);
              };
              video.addEventListener('canplay', onCanPlay);
              setTimeout(resolve, 1000);
            });
          }
          
          if (playAttemptRef.current !== attemptId) return;
          
          video.playbackRate = 1.0;
          await video.play();
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('Video autoplay failed:', err.name);
        }
      };
      
      const delay = isInCache(videoUrl) ? 0 : 50;
      setTimeout(playWithRetry, delay);
    }
    
    // Cleanup: always stop on unmount or dependency change
    return () => {
      playAttemptRef.current++;
      if (video) {
        video.pause();
        video.muted = true;
        video.volume = 0;
      }
    };
  }, [shouldPlay, videoError, videoUrl, isActive, isPaused, hardStop]);

  // Additional effect specifically to handle when isActive becomes false
  useEffect(() => {
    if (!isActive) {
      const video = videoRef.current;
      if (video) {
        hardStop(video);
      }
    }
  }, [isActive, hardStop]);

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

  if (videoError) {
    return (
      <div className={cn("absolute inset-0", className)}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="eager" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 w-full h-full", className)} onClick={handleClick}>
      {/* Cover image as instant background - full screen */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out",
            videoLoaded && !isBuffering ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Minimal loading indicator */}
      {!videoLoaded && !coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Video element - optimized for iOS with sound */}
      <video
        ref={videoRef}
        src={isActive ? videoUrl : undefined}
        loop
        playsInline
        webkit-playsinline="true"
        muted={!isActive}
        preload={isActive ? "auto" : "metadata"}
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: 'translate3d(0,0,0)',
          WebkitTransform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: 'opacity 0.3s ease-out',
        }}
      />

      {/* Buffering indicator */}
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

      {/* Pause overlay */}
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

      {/* Tap feedback */}
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
    </div>
  );
});