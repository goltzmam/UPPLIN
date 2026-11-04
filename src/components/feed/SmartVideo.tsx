import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Loader2, Pause, Play, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartVideoProps {
  src: string;
  poster?: string | null;
  active?: boolean;
  className?: string;
  fit?: "cover" | "contain";
  label?: string;
  feed?: boolean;
}

/** Inline, muted autoplay. Only the visible player owns playback; scrolling never tears down its source. */
export function SmartVideo({ src, poster, active = true, className, fit = "cover", label = "Vídeo da publicação", feed = false }: SmartVideoProps) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const suspended = useRef(false);
  const mayPlay = useRef(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const audioSettings = useRef({ muted, volume });
  audioSettings.current = { muted, volume };
  const [soundControls, setSoundControls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);
  const [requested, setRequested] = useState(false);
  const shouldPlay = active && visible && pageVisible;
  mayPlay.current = shouldPlay;

  const play = useCallback(async () => {
    const el = video.current;
    if (!el || !mayPlay.current || userPaused.current || suspended.current) return;
    try {
      await el.play();
      if (!mayPlay.current || userPaused.current || suspended.current) el.pause();
    } catch (error) {
      if ((error as Error).name === "NotAllowedError" && !el.muted) {
        el.muted = true; setMuted(true);
        await el.play().catch(() => setPaused(true));
      }
    }
  }, []);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting && entries[0].intersectionRatio >= 0.55), { threshold: [0, 0.55, 1] });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const change = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    const fullscreenChanged = () => setInFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", fullscreenChanged);
    const el = video.current;
    const otherPlaying = (event: Event) => { if ((event as CustomEvent).detail !== el) { suspended.current = true; el?.pause(); } };
    const suspend = () => { suspended.current = true; el?.pause(); };
    const resume = () => { suspended.current = false; void play(); };
    document.addEventListener("upplin:media-stop", suspend);
    document.addEventListener("upplin:media-resume", resume);
    document.addEventListener("upplin:video-playing", otherPlaying);
    return () => { document.removeEventListener("upplin:media-stop", suspend); document.removeEventListener("upplin:media-resume", resume); document.removeEventListener("fullscreenchange", fullscreenChanged); document.removeEventListener("visibilitychange", change); document.removeEventListener("upplin:video-playing", otherPlaying); el?.pause(); };
  }, [play]);
  useEffect(() => {
    userPaused.current = false; setFailed(false); setProgress(0); setDuration(0);
  }, [src]);
  useEffect(() => {
    if (shouldPlay) { suspended.current = false; userPaused.current = false; setRequested(true); if (video.current) { video.current.muted = audioSettings.current.muted; video.current.volume = audioSettings.current.volume; } void play(); }
    else { video.current?.pause(); setSoundControls(false); }
  }, [shouldPlay, play]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) { suspended.current = false; userPaused.current = false; void play(); }
    else { userPaused.current = true; el.pause(); }
  };
  const fullscreen = async () => {
    const el = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (container.current?.requestFullscreen) await container.current.requestFullscreen().catch(() => setExpanded(value => !value));
    else if (el?.webkitEnterFullscreen) el.webkitEnterFullscreen();
    else setExpanded(value => !value);
  };
  const controlClass = "flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
  return <div ref={container} className={cn("relative isolate overflow-hidden bg-black", expanded && "!fixed inset-0 z-[1200] !h-[100dvh] !w-screen", className)}>
    <video ref={video} src={requested ? src : undefined} poster={poster || undefined} autoPlay muted={muted} playsInline loop preload={requested ? "auto" : "none"} aria-label={label}
      className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
      onClick={toggle}
      onLoadedData={() => { setLoading(false); void play(); }}
      onCanPlay={() => { setLoading(false); void play(); }}
      onWaiting={() => setLoading(true)} onPlaying={() => { if (!mayPlay.current || suspended.current || userPaused.current) { video.current?.pause(); return; } setPaused(false); setLoading(false); document.dispatchEvent(new CustomEvent("upplin:video-playing", { detail: video.current })); }}
      onPause={() => setPaused(true)} onError={() => { if (requested) { setFailed(true); setLoading(false); } }}
      onDurationChange={() => setDuration(Number.isFinite(video.current?.duration) ? video.current!.duration : 0)}
      onTimeUpdate={() => setProgress(video.current?.currentTime || 0)}
    />
    {failed ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center text-white"><p className="text-sm">Não foi possível reproduzir este vídeo.</p><button type="button" className={controlClass} aria-label="Tentar reproduzir novamente" onClick={() => { setFailed(false); video.current?.load(); void play(); }}><RotateCcw className="h-5 w-5" /></button></div>
      : loading && shouldPlay && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Loader2 aria-label="Carregando vídeo" className="h-7 w-7 animate-spin text-white" /></div>}
    {paused && !loading && !failed && shouldPlay && <button type="button" onClick={toggle} aria-label="Reproduzir vídeo" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"><Play className="h-8 w-8" /></button>}
    <div className={cn("absolute left-3 right-3 flex items-start justify-between gap-2", feed ? "top-[calc(var(--safe-top)+76px)]" : "top-3")}>
      <div className="flex gap-2"><button type="button" className={controlClass} aria-label={paused ? "Reproduzir vídeo" : "Pausar vídeo"} onClick={toggle}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button type="button" className={controlClass} aria-label={expanded || inFullscreen ? "Fechar vídeo ampliado" : "Ampliar vídeo"} onClick={() => { if (inFullscreen) void document.exitFullscreen(); else if (expanded) setExpanded(false); else void fullscreen(); }}><Expand className="h-4 w-4" /></button></div>
      <div className="flex flex-col items-end gap-2"><button type="button" className={controlClass} aria-label={muted ? "Ativar som" : "Silenciar vídeo"} onClick={() => { const value = !muted; setMuted(value); setSoundControls(true); if (video.current) { video.current.muted = value; video.current.volume = volume; } void play(); }}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        {soundControls && <input aria-label="Volume do vídeo" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} className="w-24 accent-red-500" onChange={e => { const value = Number(e.target.value); setVolume(value); setMuted(value === 0); if (video.current) { video.current.volume = value; video.current.muted = value === 0; } }} />}
      </div>
    </div>
    {duration > 0 && <input aria-label="Posição do vídeo" type="range" min="0" max={duration} step="0.1" value={Math.min(progress, duration)} className={cn("absolute inset-x-3 h-4 w-[calc(100%-1.5rem)] accent-red-500", feed ? "bottom-[calc(var(--app-bottom-offset,100px)+4px)] lg:bottom-1" : "bottom-1")} onChange={e => { const value = Number(e.target.value); if (video.current) video.current.currentTime = value; setProgress(value); }} />}
  </div>;
}
