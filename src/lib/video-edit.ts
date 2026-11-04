export function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type)) || null;
}

/** Encode the selected interval and crop into a real file; no metadata-only edits. */
export async function editVideo(file: File, options: { start: number; end: number; muted: boolean; portrait: boolean; signal: AbortSignal; onProgress: (value: number) => void }) {
  const mime = recordingMimeType();
  if (!mime || !HTMLCanvasElement.prototype.captureStream) throw new Error("Este navegador não permite exportar vídeos editados. Use o vídeo original ou atualize o navegador.");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url; video.playsInline = true; video.preload = "auto";
  const canvas = document.createElement("canvas");
  let stream: MediaStream | undefined; let audio: AudioContext | undefined; let frame = 0; let recorder: MediaRecorder | undefined;
  try {
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("Não foi possível abrir o vídeo.")); options.signal.addEventListener("abort", () => reject(new DOMException("Cancelado", "AbortError")), { once: true }); });
    if (options.signal.aborted) throw new DOMException("Cancelado", "AbortError");
    const end = Math.min(options.end, video.duration);
    if (!Number.isFinite(end) || end <= options.start || end - options.start > 120) throw new Error("Selecione um trecho de até 2 minutos.");
    const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, Math.round((options.portrait ? Math.min(video.videoWidth, video.videoHeight * 9 / 16) : video.videoWidth) * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round((options.portrait ? Math.min(video.videoHeight, video.videoWidth * 16 / 9) : video.videoHeight) * scale / 2) * 2);
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Edição de vídeo indisponível.");
    stream = canvas.captureStream(30);
    // Route original audio into the exported file without playing it through the speakers.
    if (!options.muted) {
      audio = new AudioContext(); await audio.resume();
      const source = audio.createMediaElementSource(video); const destination = audio.createMediaStreamDestination(); source.connect(destination);
      destination.stream.getAudioTracks().forEach(track => stream!.addTrack(track));
    } else video.muted = true;
    await new Promise<void>(resolve => { video.onseeked = () => resolve(); if (options.start > 0) video.currentTime = options.start; else resolve(); });
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const result = new Promise<File>((resolve, reject) => {
      const abort = () => { if (recorder?.state !== "inactive") recorder?.stop(); reject(new DOMException("Cancelado", "AbortError")); };
      options.signal.addEventListener("abort", abort, { once: true });
      recorder!.onerror = () => reject(new Error("Não foi possível exportar o vídeo."));
      recorder!.onstop = () => { options.signal.removeEventListener("abort", abort); resolve(new File(chunks, `video-editado.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: mime.split(";")[0] })); };
    });
    const draw = () => {
      if (video.readyState >= 2) {
        const ratio = canvas.width / canvas.height; const sourceRatio = video.videoWidth / video.videoHeight;
        const width = options.portrait && sourceRatio > ratio ? video.videoHeight * ratio : video.videoWidth;
        const height = options.portrait && sourceRatio < ratio ? video.videoWidth / ratio : video.videoHeight;
        ctx.drawImage(video, (video.videoWidth - width) / 2, (video.videoHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
      }
      options.onProgress(Math.min(100, Math.round((video.currentTime - options.start) / (end - options.start) * 100)));
      if (video.currentTime >= end || video.ended) { if (recorder?.state === "recording") recorder.stop(); video.pause(); }
      else frame = requestAnimationFrame(draw);
    };
    recorder.start(250); await video.play(); draw();
    return await result;
  } finally {
    cancelAnimationFrame(frame); video.pause(); video.removeAttribute("src"); video.load();
    if (recorder?.state === "recording") recorder.stop(); stream?.getTracks().forEach(track => track.stop()); await audio?.close(); URL.revokeObjectURL(url);
  }
}
