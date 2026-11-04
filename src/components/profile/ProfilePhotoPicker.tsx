import { stopAllMediaPipelines } from "@/lib/media";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/feed/CameraCapture";
import { Camera, ImagePlus } from "lucide-react";

export function ProfilePhotoPicker({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (value: boolean) => void; onSelect: (file: File) => void }) {
  useEffect(() => { if (!open) return; stopAllMediaPipelines(); return () => { document.dispatchEvent(new Event("upplin:media-resume")); }; }, [open]);
  const input = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const choose = (file?: File) => { if (file) { onSelect(file); setCamera(false); onOpenChange(false); } };
  return <Dialog open={open} onOpenChange={value => { if (!value) setCamera(false); onOpenChange(value); }}><DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-md flex-col overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Escolher foto</DialogTitle><DialogDescription>Use a câmera ou escolha uma imagem da galeria.</DialogDescription></DialogHeader><input type="file" ref={input} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" aria-label="Foto da galeria" onChange={event => { choose(event.target.files?.[0]); event.target.value = ""; }} />{camera && <div className="flex min-h-[50dvh] flex-col"><CameraCapture photoOnly onCapture={choose} onText={() => setCamera(false)} /></div>}<div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={() => setCamera(true)}><Camera className="mr-2 h-4 w-4" />Abrir câmera</Button><Button variant="outline" onClick={() => input.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Galeria de fotos</Button></div></DialogContent></Dialog>;
}
