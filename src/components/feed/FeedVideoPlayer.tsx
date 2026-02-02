import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playAttemptRef = useRef(0);

  const shouldPlay = isActive && !isPaused && !videoError && !forceStop;

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

      video.muted = false;
      video.volume = 1;

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

      // Use RAF for smoother initialization
      requestAnimationFrame(() => {
        if (playAttemptRef.current === attemptId) {
          playVideo();
        }
      });
    }

    return () => {
      playAttemptRef.current++;
    };
  }, [shouldPlay, videoUrl, isActive, isPaused, forceStop]);

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

  // Buffering detection - simplified
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

  const handleClick = useCallback(() => {
    if (videoError || forceStop) return;
    setIsPaused((p) => !p);
  }, [videoError, forceStop]);

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
    <div className={cn("absolute inset-0 w-full h-full", className)} onClick={handleClick}>
      {/* Cover image as background */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
            videoLoaded && !isBuffering && !isPaused ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          aria-hidden="true"
        />
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={isActive && !forceStop ? videoUrl : undefined}
        loop
        playsInline
        webkit-playsinline="true"
        muted={!isActive || forceStop}
        preload={isActive ? "auto" : "none"}
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleVideoLoaded}
        onError={handleVideoError}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
        }}
      />

      {/* Buffering indicator - simple CSS only */}
      {isBuffering && videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Pause overlay - simple CSS only */}
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
