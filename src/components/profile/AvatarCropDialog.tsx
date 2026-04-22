import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AvatarCropDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => Promise<void> | void;
  isSubmitting?: boolean;
}

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

export function AvatarCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: AvatarCropDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const baseScale = useMemo(() => {
    return Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  }, [imageSize.height, imageSize.width]);

  const displayScale = baseScale * zoom;
  const scaledWidth = imageSize.width * displayScale;
  const scaledHeight = imageSize.height * displayScale;
  const maxOffsetX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

  const clampOffset = (nextX: number, nextY: number) => ({
    x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
    y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
  });

  useEffect(() => {
    setOffset((current) => clampOffset(current.x, current.y));
  }, [maxOffsetX, maxOffsetY]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewUrl) return;
    setDragging(true);
    setLastPoint({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const deltaX = event.clientX - lastPoint.x;
    const deltaY = event.clientY - lastPoint.y;
    setLastPoint({ x: event.clientX, y: event.clientY });
    setOffset((current) => clampOffset(current.x + deltaX, current.y + deltaY));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleConfirm = async () => {
    if (!file || !previewUrl) return;

    const image = new Image();
    image.src = previewUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível carregar a imagem para recorte."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível preparar o editor da imagem.");
    }

    const sourceSize = CROP_SIZE / displayScale;
    const sourceX = imageSize.width / 2 - sourceSize / 2 - offset.x / displayScale;
    const sourceY = imageSize.height / 2 - sourceSize / 2 - offset.y / displayScale;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      throw new Error("Não foi possível gerar a imagem recortada.");
    }

    const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
    await onConfirm(croppedFile);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-card p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
          <DialogDescription>
            Arraste a imagem e ajuste o zoom para deixar a foto no formato padrão de avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-[2rem] border border-border bg-muted touch-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Prévia para recorte"
                  onLoad={(event) => {
                    setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                  }}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: imageSize.width * displayScale,
                    height: imageSize.height * displayScale,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  }}
                  draggable={false}
                />
              )}

              <div className="pointer-events-none absolute inset-0 bg-background/40" />
              <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.68)]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button className="btn-gradient" onClick={handleConfirm} disabled={!file || isSubmitting}>
            {isSubmitting ? "Salvando..." : "Usar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}