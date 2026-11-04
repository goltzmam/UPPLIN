import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/hooks/use-object-url";
import { editVideo } from "@/lib/video-edit";
import { getPostMediaValidationError } from "@/lib/social-posts";

export function VideoAdjustments({ file, onApply, onCancel }: { file: File; onApply: (file: File) => void; onCancel: () => void }) {
  const url = useObjectUrl(file);
  const player = useRef<HTMLVideoElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [muted, setMuted] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  const apply = async () => {
    controller.current = new AbortController(); setProgress(0); setError(""); player.current?.pause();
    try {
      const result = await editVideo(file, { start, end, muted, portrait, signal: controller.current.signal, onProgress: setProgress });
      const validation = getPostMediaValidationError(result); if (validation) throw new Error(validation);
      onApply(result);
    } catch (cause) { if ((cause as Error).name !== "AbortError") setError(cause instanceof DOMException ? "Não foi possível processar o vídeo neste navegador. Você pode usar o arquivo original." : cause instanceof Error ? cause.message : "Não foi possível salvar as alterações."); }
    finally { setProgress(null); }
  };
  return <div className="space-y-4">
    <h3 className="font-semibold">Ajustar vídeo</h3>
    <video ref={player} src={url || undefined} autoPlay muted playsInline loop preload="metadata" className={`mx-auto max-h-[35dvh] w-full rounded-xl bg-black ${portrait ? "aspect-[9/16] object-cover" : "object-contain"}`} onLoadedMetadata={event => { const value = event.currentTarget.duration; if (Number.isFinite(value)) { setDuration(value); setEnd(Math.min(value, 120)); } }} onTimeUpdate={event => { if (event.currentTarget.currentTime > end && end > start) event.currentTarget.currentTime = start; }} />
    <fieldset disabled={progress !== null} className="space-y-3">
      <label className="block text-sm">Início: {start.toFixed(1)}s<input type="range" aria-label="Início do trecho" min="0" max={Math.max(0, end - 0.5)} step="0.1" value={start} className="mt-2 block w-full accent-red-500" onChange={event => { const value = Number(event.target.value); setStart(value); if (player.current) player.current.currentTime = value; }} /></label>
      <label className="block text-sm">Fim: {end.toFixed(1)}s<input type="range" aria-label="Fim do trecho" min={start + 0.5} max={duration || 0.5} step="0.1" value={end} className="mt-2 block w-full accent-red-500" onChange={event => setEnd(Number(event.target.value))} /></label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={muted} onChange={event => setMuted(event.target.checked)} />Remover áudio</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={portrait} onChange={event => setPortrait(event.target.checked)} />Recortar para vertical (9:16, centralizado)</label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {progress !== null && <div role="status" className="space-y-2 text-sm"><p>Preparando vídeo · {progress}%</p><progress value={progress} max="100" className="w-full" /><p className="text-xs text-muted-foreground">Mantenha esta tela aberta. O trecho é processado no seu dispositivo.</p></div>}
    <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { controller.current?.abort(); onCancel(); }}>Cancelar</Button><Button disabled={!duration || end <= start || end - start > 120 || progress !== null} onClick={() => void apply()}>Salvar ajustes</Button></div>
    <p className="text-xs text-muted-foreground">Selecione um trecho de até 2 minutos. Você também pode publicar o arquivo original.</p>
  </div>;
}
