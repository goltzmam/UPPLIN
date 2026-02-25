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

// Full teardown – only used on unmount / forceStop / visibility-hide
function hardStop(video: HTMLVideoElement) {
  try { video.pause(); } catch { /* ignore */ }
  try { video.muted = true; video.volume = 0; } catch { /* ignore */ }
  try { video.currentTime = 0; } catch { /* ignore */ }
  try { video.removeAttribute("src"); video.load(); } catch { /* ignore */ }
}

// Soft pause – keeps src intact so playback can resume instantly
function softPause(video: HTMLVideoElement) {
  try { video.pause(); } catch { /* ignore */ }
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
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playAttemptRef = useRef(0);
  const isMobile = useIsMobile();

  // Long-press refs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Reset pause when card becomes active
  useEffect(() => {
    if (isActive) setIsPaused(false);
  }, [isActive]);

  // Main play/pause effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptId = ++playAttemptRef.current;

    // Force stop → full teardown
    if (forceStop || !isActive) {
      softPause(video);
      return;
    }

    // User paused
    if (isPaused) {
      softPause(video);
      return;
    }

    // Should play
    if (!videoError) {
      // Ensure src is set
      if (!video.src || !video.src.includes(videoUrl)) {
        video.src = videoUrl;
      }
      video.muted = isMuted;
      video.volume = isMuted ? 0 : 1;

      const playVideo = async () => {
        if (playAttemptRef.current !== attemptId) return;
        try {
          if (video.readyState < 2) {
            await new Promise<void>((resolve) => {
              const onCanPlay = () => { video.removeEventListener("canplay", onCanPlay); resolve(); };
              video.addEventListener("canplay", onCanPlay);
              setTimeout(resolve, 800);
            });
          }
          if (playAttemptRef.current !== attemptId) return;
          await video.play();
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") return;
          console.warn("Video play failed:", err);
        }
      };

      requestAnimationFrame(() => {
        if (playAttemptRef.current === attemptId) playVideo();
      });
    }

    return () => { playAttemptRef.current++; };
  }, [isActive, isPaused, forceStop, videoUrl, isMuted, videoError]);

  // Sync mute
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

  // Visibility change
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        const video = videoRef.current;
        if (video) softPause(video);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
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

  // Desktop click to toggle pause
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMobile || videoError || forceStop) return;
    if ((e.target as HTMLElement).closest('[data-mute-btn]')) return;
    setIsPaused((p) => !p);
  }, [isMobile, videoError, forceStop]);

  // Mobile long-press to pause
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || videoError || forceStop) return;
    if ((e.target as HTMLElement).closest('[data-mute-btn]')) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsPaused((p) => !p);
    }, 400);
  }, [isMobile, videoError, forceStop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    touchStartPosRef.current = null;
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted((m) => !m);
  }, []);

  const handleVideoError = useCallback(() => { setVideoError(true); setVideoLoaded(false); }, []);
  const handleVideoLoaded = useCallback(() => { setVideoLoaded(true); setVideoError(false); setIsBuffering(false); }, []);

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
      {/* Blurred background */}
      {coverUrl && (
        <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" loading="eager" aria-hidden="true" />
      )}

      {/* Cover image */}
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

      {/* Video element */}
      <video
        ref={videoRef}
        loop
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload={isActive ? "auto" : "none"}
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 w-full h-full object-contain z-[1] transition-opacity duration-200",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
      />

      {/* Mute button */}
      {isActive && !forceStop && videoLoaded && !isPaused && (
        <button
          data-mute-btn
          onClick={handleToggleMute}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            handleToggleMute(e);
          }}
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 border border-white/10"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
        </button>
      )}

      {/* Buffering */}
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
