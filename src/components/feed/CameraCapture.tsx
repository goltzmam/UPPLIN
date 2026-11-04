import { useEffect, useRef, useState } from "react";
import { Camera, Circle, FlipHorizontal2, Loader2, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordingMimeType } from "@/lib/video-edit";

export function CameraCapture({ onCapture, onText, photoOnly = false }: { onCapture: (file: File) => void; onText: () => void; photoOnly?: boolean }) {
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);
  const microphone = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true; let cancelled = false;
    setReady(false); setError("");
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Câmera indisponível neste navegador. Você pode escolher um arquivo na galeria.");
        const value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false });
        if (cancelled) { value.getTracks().forEach(track => track.stop()); return; }
        stream.current = value;
        if (preview.current) { preview.current.srcObject = value; await preview.current.play(); }
        setReady(true);
      } catch (cause) { if (!cancelled) setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Permita o acesso à câmera no navegador para gravar. Você também pode usar a galeria." : "Não foi possível abrir a câmera. Verifique a permissão, feche outros aplicativos que estejam usando a câmera ou escolha a galeria."); }
    })();
    return () => { cancelled = true; alive.current = false; if (timer.current) clearInterval(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); microphone.current?.getTracks().forEach(track => track.stop()); };
  }, [facing]);

  const capture = async () => {
    if (recording) { recorder.current?.stop(); return; }
    if (!ready || !preview.current || busy) return;
    if (mode === "photo") {
      setBusy(true);
      const video = preview.current; const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth * scale; canvas.height = video.videoHeight * scale;
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { setBusy(false); if (blob) onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" })); }, "image/jpeg", 0.9);
      return;
    }
    const mime = recordingMimeType();
    if (!mime) { setError("A gravação não está disponível neste navegador. Escolha um vídeo da galeria."); return; }
    setBusy(true); setError("");
    try {
      microphone.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { microphone.current.getTracks().forEach(track => track.stop()); return; }
      const combined = new MediaStream([...(stream.current?.getVideoTracks() || []), ...microphone.current.getAudioTracks()]);
      const value = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 3_000_000 }); recorder.current = value;
      const chunks: Blob[] = []; let size = 0;
      value.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); size += event.data.size; if (size > 45 * 1024 * 1024 && value.state === "recording") value.stop(); } };
      value.onstop = () => { if (timer.current) clearInterval(timer.current); microphone.current?.getTracks().forEach(track => track.stop()); if (alive.current) { setRecording(false); if (chunks.length) onCapture(new File(chunks, `video-${Date.now()}.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: mime.split(";")[0] })); } };
      value.onerror = () => { setError("Não foi possível gravar. Tente novamente ou use a galeria."); setRecording(false); };
      value.start(250); setRecording(true); setSeconds(0); let elapsed = 0;
      timer.current = setInterval(() => { elapsed++; setSeconds(elapsed); if (elapsed >= 60 && value.state === "recording") value.stop(); }, 1000);
    } catch { setError("Permita o microfone para gravar vídeos com som, ou use a galeria."); }
    finally { if (alive.current) setBusy(false); }
  };
  return <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-zinc-950">
    <video ref={preview} data-camera autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
    {!ready && !error && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" aria-label="Abrindo câmera" /></div>}
    {error && <p role="status" className="relative m-auto max-w-sm rounded-2xl bg-black/70 p-5 text-center text-sm leading-relaxed text-white">{error}</p>}
    <div className="relative mt-auto space-y-3 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-14 text-white">
      {recording && <p role="status" className="text-center font-semibold text-red-400">Gravando · {seconds}s / 60s</p>}
      <div className="flex items-center justify-center gap-3"><Button type="button" variant={mode === "photo" ? "secondary" : "ghost"} disabled={recording || busy} onClick={() => setMode("photo")}><Camera className="mr-2 h-4 w-4" />Foto</Button>{!photoOnly && <Button type="button" variant={mode === "video" ? "secondary" : "ghost"} disabled={recording || busy} onClick={() => setMode("video")}><Video className="mr-2 h-4 w-4" />Vídeo</Button>}<Button type="button" variant="ghost" disabled={recording || busy} onClick={onText}>{photoOnly ? "Voltar" : "Texto"}</Button></div>
      <div className="flex items-center justify-center gap-7"><button type="button" aria-label="Alternar câmera" disabled={recording || busy} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40" onClick={() => setFacing(value => value === "user" ? "environment" : "user")}><FlipHorizontal2 /></button><button type="button" aria-label={recording ? "Parar gravação" : mode === "photo" ? "Tirar foto" : "Gravar vídeo"} disabled={!ready || busy} className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/10 disabled:opacity-40" onClick={() => void capture()}>{busy ? <Loader2 className="animate-spin" /> : recording ? <Square className="fill-red-500 text-red-500" /> : <Circle className={mode === "video" ? "h-14 w-14 fill-red-500 text-red-500" : "h-14 w-14 fill-white"} />}</button><div className="w-11" /></div>
    </div>
  </div>;
}
