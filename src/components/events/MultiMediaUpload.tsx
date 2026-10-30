import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon, Video, GripVertical, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  sort_order: number;
  isUploading?: boolean;
}

interface MultiMediaUploadProps {
  eventId: string;
  organizerId: string;
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  disabled?: boolean;
}

export function MultiMediaUpload({
  eventId,
  organizerId,
  media,
  onChange,
  disabled = false,
}: MultiMediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        console.error("File must be an image or video");
        return null;
      }

      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.error(`File too large (max ${isVideo ? "100MB" : "10MB"})`);
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const folderPath = eventId === "novo" ? organizerId : `${organizerId}/${eventId}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        type: isVideo ? "video" : "image",
      };
    },
    [eventId, organizerId]
  );

  const handleFilesUpload = async (files: FileList) => {
    if (disabled || uploading) return;

    setUploading(true);

    const newMedia: MediaItem[] = [];

    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      if (result) {
        newMedia.push({
          id: `new-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          url: result.url,
          type: result.type as "image" | "video",
          sort_order: media.length + newMedia.length,
        });
      }
    }

    onChange([...media, ...newMedia]);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeMedia = async (item: MediaItem) => {
    // Defer storage deletion until the parent successfully saves the event.
    // Update state
    const updated = media.filter((m) => m.id !== item.id);
    onChange(updated.map((m, i) => ({ ...m, sort_order: i })));
  };

  const moveMedia = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= media.length) return;

    const updated = [...media];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated.map((m, i) => ({ ...m, sort_order: i })));
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item, index) => (
            <div
              key={item.id}
              className="relative aspect-video rounded-xl overflow-hidden bg-muted group"
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Type Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs flex items-center gap-1">
                {item.type === "video" ? (
                  <Video className="h-3 w-3" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
                {item.type === "video" ? "Vídeo" : "Imagem"}
              </div>

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                    onClick={() => moveMedia(index, "up")}
                  >
                    ←
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-full"
                  aria-label="Remover mídia do evento"
                  onClick={() => removeMedia(item)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {index < media.length - 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                    onClick={() => moveMedia(index, "down")}
                  >
                    →
                  </Button>
                )}
              </div>

              {/* Order Badge */}
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6",
          media.length > 0 ? "py-4" : "aspect-video",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Enviando...</span>
          </>
        ) : (
          <>
            <div className={cn("flex items-center justify-center gap-2", media.length > 0 && "flex-row")}>
              {media.length === 0 && (
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Plus className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className={cn("text-center", media.length > 0 && "text-left")}>
                <p className="text-sm font-medium">
                  <span className="text-primary">Adicionar mídia</span>
                  {media.length === 0 && " ou arraste"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Imagens ou vídeos (máx. 10MB img / 100MB vídeo)
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {media.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Arraste as mídias para reordenar. A primeira imagem será usada como capa.
        </p>
      )}
    </div>
  );
}
