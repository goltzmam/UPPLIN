import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Video, Clock, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  eventId: string;
  organizerId: string;
  videoUrl: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_DURATION_SECONDS = 60;
const MAX_FILE_SIZE_MB = 50;

function translateUploadError(message: string): string {
  const msg = (message || "").toLowerCase();
  if (msg.includes("mime type") && msg.includes("not supported")) {
    return "Formato de vídeo não suportado. Use MP4, WebM ou MOV.";
  }
  if (msg.includes("payload too large") || msg.includes("exceeded the maximum")) {
    return `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB.`;
  }
  if (msg.includes("duplicate") || msg.includes("already exists")) {
    return "Já existe um arquivo com esse nome. Tente novamente.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (msg.includes("unauthorized") || msg.includes("not authorized")) {
    return "Você não tem permissão para enviar este arquivo.";
  }
  return "Erro ao enviar vídeo. Tente novamente.";
}

export function VideoUpload({
  eventId,
  organizerId,
  videoUrl,
  onChange,
  disabled = false,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const validateVideo = useCallback((file: File): Promise<{ valid: boolean; duration?: number; error?: string }> => {
    return new Promise((resolve) => {
      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        resolve({ valid: false, error: `Arquivo muito grande (máx. ${MAX_FILE_SIZE_MB}MB)` });
        return;
      }

      // Check file type
      if (!file.type.startsWith("video/")) {
        resolve({ valid: false, error: "Arquivo deve ser um vídeo" });
        return;
      }

      // Check duration
      const video = document.createElement("video");
      video.preload = "metadata";
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > MAX_DURATION_SECONDS) {
          resolve({ 
            valid: false, 
            duration,
            error: `Vídeo muito longo (${Math.round(duration)}s). Máximo: ${MAX_DURATION_SECONDS}s` 
          });
        } else {
          resolve({ valid: true, duration });
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ valid: false, error: "Não foi possível ler o vídeo" });
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadVideo = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    // Validate video
    const validation = await validateVideo(file);
    if (!validation.valid) {
      setError(validation.error || "Vídeo inválido");
      setUploading(false);
      return;
    }

    setVideoDuration(validation.duration || null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `feed-video-${Date.now()}.${fileExt}`;
      const folderPath = eventId === "novo" ? organizerId : `${organizerId}/${eventId}`;
      const filePath = `${folderPath}/${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  }, [eventId, organizerId, onChange, validateVideo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadVideo(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadVideo(file);
    }
  };

  const handleRemove = async () => {
    if (!videoUrl) return;
    
    try {
      const url = new URL(videoUrl);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.indexOf("event-images");
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("event-images").remove([filePath]);
      }
    } catch (e) {
      console.error("Error removing file:", e);
    }
    
    onChange(null);
    setVideoDuration(null);
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {videoUrl ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-w-xs mx-auto">
          <video
            ref={previewRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
            muted
          />
          
          {/* Remove button */}
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Duration badge */}
          {videoDuration && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs">
              <Clock className="h-3 w-3" />
              <span>{Math.round(videoDuration)}s</span>
            </div>
          )}

          {/* Success indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-lg text-white text-xs">
            <Check className="h-3 w-3" />
            <span>Pronto</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 p-8 aspect-[9/16] max-w-xs mx-auto",
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-destructive/50 bg-destructive/5"
          )}
        >
          {uploading ? (
            <div className="text-center space-y-4 w-full px-4">
              <Loader2 className="h-10 w-10 text-accent animate-spin mx-auto" />
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Enviando... {uploadProgress}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Video className="h-8 w-8 text-accent" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  <span className="text-accent">Enviar vídeo</span> para o feed
                </p>
                <p className="text-xs text-muted-foreground">
                  MP4, WebM ou MOV
                </p>
                <p className="text-xs text-muted-foreground">
                  Máx. {MAX_DURATION_SECONDS}s • {MAX_FILE_SIZE_MB}MB
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Vídeos curtos aparecem no feed estilo TikTok
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
