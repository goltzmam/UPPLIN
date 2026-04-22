import { useEffect, useState } from "react";
import { AlertCircle, PlayCircle } from "lucide-react";

interface PostMediaProps {
  mediaUrl: string;
  mediaType: string | null;
  alt?: string;
  className?: string;
}

export function PostMedia({
  mediaUrl,
  mediaType,
  alt = "Mídia do post",
  className = "",
}: PostMediaProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [mediaUrl, mediaType]);

  if (hasError) {
    return (
      <div className="mx-auto flex aspect-[9/16] w-full max-w-[22rem] items-center justify-center rounded-lg border border-border bg-muted/40 px-4 text-center">
        <div className="flex max-w-xs flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium text-foreground">Mídia indisponível</p>
          <p className="text-xs">Esse arquivo não pôde ser carregado neste dispositivo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border bg-muted/30 shadow-soft">
        {mediaType === "image" ? (
          <img
            src={mediaUrl}
            alt={alt}
            loading="lazy"
            className={`h-full w-full object-cover ${className}`.trim()}
            onError={() => setHasError(true)}
          />
        ) : (
          <video
            src={mediaUrl}
            className={`h-full w-full bg-black object-cover ${className}`.trim()}
            controls
            playsInline
            preload="metadata"
            onError={() => setHasError(true)}
          />
        )}

        {!hasError && mediaType === "video" && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full border border-border bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-soft">
            <PlayCircle className="h-3.5 w-3.5 text-primary" />
            Vídeo
          </div>
        )}
      </div>
    </div>
  );
}