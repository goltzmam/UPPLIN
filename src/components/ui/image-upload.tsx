import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  bucket: "event-images" | "avatars";
  folder?: string;
  deferDelete?: boolean;
  value?: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: "square" | "video" | "banner";
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  bucket,
  folder = "",
  deferDelete = false,
  value,
  onChange,
  aspectRatio = "video",
  className,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[3/1]",
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        console.error("File must be an image");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        console.error("File too large (max 10MB)");
        return;
      }

      setUploading(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        onChange(urlData.publicUrl);
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeImage = async () => {
    if (value && !deferDelete) {
      // Extract file path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.indexOf(bucket);
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from(bucket).remove([filePath]);
      }
    }
    onChange(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {value ? (
        <div className={cn("relative rounded-2xl overflow-hidden group", aspectClasses[aspectRatio])}>
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="rounded-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Trocar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={removeImage}
              disabled={disabled || uploading}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6",
            aspectClasses[aspectRatio],
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
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  <span className="text-primary">Clique para enviar</span> ou arraste
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP ou GIF (máx. 10MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Avatar-specific upload component
interface AvatarUploadProps {
  userId: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  size?: "sm" | "md" | "lg";
  fallback?: string;
}

export function AvatarUpload({
  userId,
  value,
  onChange,
  size = "lg",
  fallback = "U",
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className={cn(
          "rounded-full overflow-hidden ring-4 ring-background shadow-xl",
          sizeClasses[size]
        )}
      >
        {value ? (
          <img src={value} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {fallback}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
