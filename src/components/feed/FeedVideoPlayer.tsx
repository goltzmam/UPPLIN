import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FeedVideoPlayerProps {
  videoUrl: string;
  coverUrl: string | null;
  isActive: boolean;
  forceStop?: boolean;
  className?: string;
}

// Hard stop function to completely kill video playback
function hardStop(video: HTMLVideoElement) {
  try {
    video.pause();
    video.muted = true;
    video.volume = 0;
    video.currentTime = 0;
    video.removeAttribute("src");
    video.load();
  } catch {
    // ignore
  }
}

export const FeedVideoPlayer = React.memo(function FeedVideoPlayer({
  videoUrl,
  coverUrl,
  isActive,
  forceStop = false,
  className,
}: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // start muted for autoplay compliance
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playAttemptRef = useRef(0);
  const isMobile = useIsMobile();

  // Long-press refs for mobile
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const shouldPlay = isActive && !isPaused && !videoError && !forceStop;

  // Reset pause state when item changes (isActive toggles)
  useEffect(() => {
    if (isActive) {
      setIsPaused(false);
    }
  }, [isActive]);

  // Single consolidated effect for play/pause management
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptId = ++playAttemptRef.current;

    // Stop if not active or forced stop
    if (!isActive || forceStop || isPaused) {
      hardStop(video);
      setVideoLoaded(false);
      return;
    }

    // Play video
    if (shouldPlay) {
      if (!video.src || video.src === "") {
        video.src = videoUrl;
      }

      video.muted = isMuted;
      video.volume = isMuted ? 0 : 1;

      const playVideo = async () => {
        if (playAttemptRef.current !== attemptId) return;

        try {
          if (video.readyState < 2) {
            video.load();
            await new Promise<void>((resolve) => {
              const onCanPlay = () => {
                video.removeEventListener("canplay", onCanPlay);
                resolve();
              };
              video.addEventListener("canplay", onCanPlay);
              setTimeout(resolve, 500);
            });
          }

          if (playAttemptRef.current !== attemptId) return;
          await video.play();
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") return;
        }
      };

      requestAnimationFrame(() => {
        if (playAttemptRef.current === attemptId) {
          playVideo();
        }
      });
    }

    return () => {
      playAttemptRef.current++;
    };
  }, [shouldPlay, videoUrl, isActive, isPaused, forceStop, isMuted]);

  // Sync mute to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && isActive && !forceStop) {
      video.muted = isMuted;
      video.volume = isMuted ? 0 : 1;
    }
  }, [isMuted, isActive, forceStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) hardStop(video);
    };
  }, []);

  // Visibility change handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onHide = () => {
      if (document.hidden) {
        hardStop(video);
        setVideoLoaded(false);
      }
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // Buffering detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
    };
  }, []);

  // Desktop: simple click to toggle pause
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMobile || videoError || forceStop) return;
    // Don't toggle if clicking the mute button
    if ((e.target as HTMLElement).closest('[data-mute-btn]')) return;
    setIsPaused((p) => !p);
  }, [isMobile, videoError, forceStop]);

  // Mobile: long-press to pause
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || videoError || forceStop) return;
    // Don't handle if touching the mute button
    if ((e.target as HTMLElement).closest('[data-mute-btn]')) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggeredRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsPaused((p) => !p);
    }, 400); // 400ms long press
  }, [isMobile, videoError, forceStop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // Cancel long-press if finger moves too much (scrolling)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted((m) => !m);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setVideoLoaded(false);
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
    setIsBuffering(false);
  }, []);

  // Error fallback - show cover
  if (videoError) {
    return (
      <div className={cn("absolute inset-0", className)}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="eager" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 to-zinc-800" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("absolute inset-0 w-full h-full", className)}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cover image as blurred background */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Cover image preserving aspect ratio */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-contain z-[1] transition-opacity duration-200",
            videoLoaded && !isBuffering && !isPaused ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Video element - preserve aspect ratio */}
      <video
        ref={videoRef}
        src={isActive && !forceStop ? videoUrl : undefined}
        loop
        playsInline
        webkit-playsinline="true"
        muted={isMuted || !isActive || forceStop}
        preload={isActive ? "auto" : "none"}
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 w-full h-full object-contain z-[1] transition-opacity duration-200",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
        }}
      />

      {/* Mute/Unmute button */}
      {isActive && !forceStop && videoLoaded && !isPaused && (
        <button
          data-mute-btn
          onClick={handleToggleMute}
          onTouchEnd={(e) => {
            e.stopPropagation();
            // Cancel any long-press
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
            handleToggleMute(e);
          }}
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 border border-white/10"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </button>
      )}

      {/* Buffering indicator */}
      {isBuffering && videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <div className="h-20 w-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Play className="h-10 w-10 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
});
