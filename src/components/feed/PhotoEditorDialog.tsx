import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crop, Sliders, Sparkles, RotateCw, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoEditorDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => Promise<void> | void;
  isSubmitting?: boolean;
}

type AspectKey = "free" | "1:1" | "4:5" | "9:16";
type FilterKey =
  | "none"
  | "vivido"
  | "quente"
  | "frio"
  | "vintage"
  | "pb"
  | "sepia"
  | "cinema";

const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
  { key: "4:5", label: "4:5", ratio: 4 / 5 },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "free", label: "Livre", ratio: null },
];

const FILTERS: { key: FilterKey; label: string; css: string }[] = [
  { key: "none", label: "Original", css: "" },
  { key: "vivido", label: "Vívido", css: "saturate(1.4) contrast(1.1)" },
  { key: "quente", label: "Quente", css: "sepia(0.2) saturate(1.3) hue-rotate(-10deg)" },
  { key: "frio", label: "Frio", css: "saturate(1.1) hue-rotate(15deg) brightness(1.05)" },
  { key: "vintage", label: "Vintage", css: "sepia(0.45) contrast(0.95) saturate(0.9)" },
  { key: "pb", label: "P&B", css: "grayscale(1) contrast(1.05)" },
  { key: "sepia", label: "Sépia", css: "sepia(0.85)" },
  { key: "cinema", label: "Cinema", css: "contrast(1.15) saturate(0.85) brightness(0.95)" },
];

const OUTPUT_MAX = 1440;

export function PhotoEditorDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: PhotoEditorDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<AspectKey>("4:5");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [filter, setFilter] = useState<FilterKey>("none");
  const [isExporting, setIsExporting] = useState(false);
  const [tab, setTab] = useState<"crop" | "adjust" | "filter">("crop");
  const [stageSize, setStageSize] = useState({ w: 320, h: 400 });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFilter("none");
    setAspect("4:5");
    setTab("crop");

    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!stageRef.current) return;
    const update = () => {
      const w = Math.min(stageRef.current!.clientWidth, 480);
      const ratio = ASPECTS.find((a) => a.key === aspect)?.ratio ?? 4 / 5;
      const h = Math.round(w / ratio);
      setStageSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [aspect, open]);

  const cssFilter = useMemo(() => {
    const base = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    const extra = FILTERS.find((f) => f.key === filter)?.css ?? "";
    return `${base} ${extra}`.trim();
  }, [brightness, contrast, saturation, filter]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const renderedSize = useMemo(() => {
    if (!imgEl) return { w: stageSize.w, h: stageSize.h };
    const stageRatio = stageSize.w / stageSize.h;
    const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
    let w: number, h: number;
    if (imgRatio > stageRatio) {
      h = stageSize.h;
      w = h * imgRatio;
    } else {
      w = stageSize.w;
      h = w / imgRatio;
    }
    return { w: w * zoom, h: h * zoom };
  }, [imgEl, stageSize, zoom]);

  const handleConfirm = async () => {
    if (!imgEl || !file) return;
    setIsExporting(true);
    try {
      const ratio = stageSize.w / stageSize.h;
      const outW = ratio >= 1 ? OUTPUT_MAX : Math.round(OUTPUT_MAX * ratio);
      const outH = ratio >= 1 ? Math.round(OUTPUT_MAX / ratio) : OUTPUT_MAX;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, outW, outH);
      ctx.filter = cssFilter;

      const scale = outW / stageSize.w;
      const drawW = renderedSize.w * scale;
      const drawH = renderedSize.h * scale;
      const cx = outW / 2 + offset.x * scale;
      const cy = outH / 2 + offset.y * scale;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const isPng = file.type === "image/png";
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
          isPng ? "image/png" : "image/jpeg",
          isPng ? undefined : 0.92,
        ),
      );
      const ext = isPng ? "png" : "jpg";
      const baseName = file.name.replace(/\.[^.]+$/, "") || "post";
      const edited = new File([blob], `${baseName}-edit.${ext}`, {
        type: blob.type,
      });
      await onConfirm(edited);
    } finally {
      setIsExporting(false);
    }
  };

  const isImage = file?.type.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Editar foto</DialogTitle>
          <DialogDescription>
            Ajuste o enquadramento, cores e aplique filtros antes de publicar.
          </DialogDescription>
        </DialogHeader>

        {!isImage ? (
          <div className="p-6 text-sm text-muted-foreground">
            A edição está disponível apenas para imagens. Vídeos serão publicados como estão.
          </div>
        ) : (
          <div className="px-5 pt-3 pb-2">
            <div
              ref={stageRef}
              className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black/80 select-none touch-none"
              style={{ height: stageSize.h }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Editar"
                  draggable={false}
                  className="absolute pointer-events-none"
                  style={{
                    width: renderedSize.w,
                    height: renderedSize.h,
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                    filter: cssFilter,
                    transformOrigin: "center center",
                  }}
                />
              )}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/10" />
                  ))}
                </div>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="crop" className="text-xs gap-1.5">
                  <Crop className="h-3.5 w-3.5" /> Cortar
                </TabsTrigger>
                <TabsTrigger value="adjust" className="text-xs gap-1.5">
                  <Sliders className="h-3.5 w-3.5" /> Ajustes
                </TabsTrigger>
                <TabsTrigger value="filter" className="text-xs gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Filtros
                </TabsTrigger>
              </TabsList>

              <TabsContent value="crop" className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => {
                        setAspect(a.key);
                        setOffset({ x: 0, y: 0 });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border transition",
                        aspect === a.key
                          ? "bg-primary/15 border-primary text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[zoom * 10]}
                    min={10}
                    max={40}
                    step={1}
                    onValueChange={([v]) => setZoom(v / 10)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                  Girar 90°
                </Button>
              </TabsContent>

              <TabsContent value="adjust" className="mt-3 space-y-3">
                {[
                  { label: "Brilho", value: brightness, set: setBrightness },
                  { label: "Contraste", value: contrast, set: setContrast },
                  { label: "Saturação", value: saturation, set: setSaturation },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{s.label}</span>
                      <span>{s.value}%</span>
                    </div>
                    <Slider
                      value={[s.value]}
                      min={50}
                      max={150}
                      step={1}
                      onValueChange={([v]) => s.set(v)}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturation(100);
                  }}
                >
                  Restaurar ajustes
                </Button>
              </TabsContent>

              <TabsContent value="filter" className="mt-3">
                <div className="grid grid-cols-4 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        "flex flex-col items-center gap-1 group",
                      )}
                    >
                      <div
                        className={cn(
                          "w-full aspect-square rounded-lg overflow-hidden border-2 bg-black/40",
                          filter === f.key ? "border-primary" : "border-transparent",
                        )}
                      >
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt={f.label}
                            className="w-full h-full object-cover"
                            style={{ filter: f.css }}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px]",
                          filter === f.key ? "text-primary font-medium" : "text-muted-foreground",
                        )}
                      >
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="px-5 py-4 border-t border-border flex-row gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isExporting || isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={isImage ? handleConfirm : () => file && onConfirm(file)}
            disabled={!file || isExporting || isSubmitting}
          >
            {isExporting || isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isImage ? "Aplicar e usar" : "Usar arquivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
