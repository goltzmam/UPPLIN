import { stopAllMediaPipelines } from "@/lib/media";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Video, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/ui/mention-input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createUserPost, getPostMediaValidationError, invalidateSocialQueries } from "@/lib/social-posts";
import { CameraCapture } from "@/components/feed/CameraCapture";
import { PhotoEditorDialog } from "@/components/feed/PhotoEditorDialog";
import { VideoAdjustments } from "@/components/feed/VideoAdjustments";
import { useObjectUrl } from "@/hooks/use-object-url";
import { SmartVideo } from "@/components/feed/SmartVideo";

export function MomentComposer({ open, onOpenChange, onPublished }: { open: boolean; onOpenChange: (value: boolean) => void; onPublished?: () => void }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const photos = useRef<HTMLInputElement>(null);
  const videos = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"camera" | "compose">("camera");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState("");
  const [photoEditor, setPhotoEditor] = useState(false);
  const [videoEditor, setVideoEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const draftFile = useRef(file);
  draftFile.current = file;
  const url = useObjectUrl(file);
  useEffect(() => { if (!open) return; stopAllMediaPipelines(); setStage(draftFile.current ? "compose" : "camera"); return () => { document.dispatchEvent(new Event("upplin:media-resume")); }; }, [open]);
  const { data: events = [] } = useQuery({
    queryKey: ["user-events-for-tagging", user?.id], enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("events:event_id(id,title,start_at)").eq("buyer_user_id", user!.id).in("status", ["issued", "used"]);
      if (error) throw error;
      return [...new Map((data || []).flatMap(item => item.events ? [item.events] : []).filter(event => new Date(event.start_at).getTime() > Date.now() - 86400000).map(event => [event.id, event])).values()];
    },
  });
  const choose = (value?: File) => {
    if (!value) return;
    const error = getPostMediaValidationError(value);
    if (error) { toast.error(error); return; }
    setFile(value); setStage("compose"); setPhotoEditor(false); setVideoEditor(false);
  };
  const publish = async () => {
    if (!user || submitting || (!file && !caption.trim())) return;
    setSubmitting(true);
    try {
      const result = await createUserPost({ userId: user.id, file, content: caption, eventId: eventId || null });
      // Refetch in the background: a slow list must not keep a completed upload dialog open.
      void invalidateSocialQueries(cache, user.id);
      toast.success(result.moderation_status === "approved" ? "Publicação compartilhada!" : "Publicação enviada.");
      setFile(null); setCaption(""); setEventId(""); onOpenChange(false); onPublished?.();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Não foi possível publicar. Tente novamente."); }
    finally { setSubmitting(false); }
  };
  const gallery = <div className="flex flex-wrap items-center justify-center gap-2">
    <Button type="button" variant="outline" disabled={submitting} onClick={() => photos.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Galeria de fotos</Button>
    <Button type="button" variant="outline" disabled={submitting} onClick={() => videos.current?.click()}><Video className="mr-2 h-4 w-4" />Galeria de vídeos</Button>
  </div>;
  return <>
    <Dialog open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}>
      <DialogContent className="!fixed !left-0 !top-0 !flex !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !flex-col gap-3 overflow-hidden border-0 bg-black p-4 pt-[max(16px,var(--safe-top))] pb-[max(16px,var(--safe-bottom))] sm:!left-1/2 sm:!top-1/2 sm:!h-[min(90dvh,900px)] sm:!w-[min(100%-2rem,560px)] sm:!max-w-[560px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-3xl sm:border">
        <DialogHeader className="shrink-0 pr-8 text-left"><DialogTitle>Compartilhar momento</DialogTitle><DialogDescription>{stage === "camera" ? "Grave, tire uma foto ou escolha algo da galeria." : "Ajuste sua mídia e adicione uma legenda."}</DialogDescription></DialogHeader>
        <input ref={photos} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" aria-label="Selecionar foto da galeria" onChange={event => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={videos} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" className="hidden" aria-label="Selecionar vídeo da galeria" onChange={event => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        {stage === "camera" ? <><CameraCapture onCapture={choose} onText={() => setStage("compose")} />{gallery}</>
          : <><div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
            {file && videoEditor ? <VideoAdjustments file={file} onApply={value => { choose(value); setVideoEditor(false); }} onCancel={() => setVideoEditor(false)} />
              : <>{file && url && <div className="relative mx-auto max-h-[45dvh] overflow-hidden rounded-2xl bg-zinc-950">
                {file.type.startsWith("video/") ? <SmartVideo src={url} fit="contain" className="h-[40dvh] w-full" /> : <img src={url} alt="Prévia da publicação" className="mx-auto max-h-[40dvh] object-contain" />}
                <div className="flex items-center justify-between gap-3 p-2"><Button type="button" variant="ghost" disabled={submitting} onClick={() => file.type.startsWith("image/") ? setPhotoEditor(true) : setVideoEditor(true)}><Wand2 className="mr-2 h-4 w-4" />Editar {file.type.startsWith("image/") ? "foto" : "vídeo"}</Button><Button type="button" variant="ghost" aria-label="Remover mídia" disabled={submitting} onClick={() => setFile(null)}><X className="h-4 w-4" /></Button></div>
              </div>}
              <MentionInput placeholder="Adicione uma legenda... Use @ para marcar" value={caption} onChange={setCaption} disabled={submitting} minHeight="88px" className="max-h-40 rounded-2xl !text-base" />
              {events.length > 0 && <label className="block space-y-2 text-sm text-muted-foreground">Marcar evento (opcional)<select aria-label="Marcar evento" value={eventId} disabled={submitting} onChange={event => setEventId(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"><option value="">Sem marcação</option>{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>}
              {gallery}<Button type="button" variant="ghost" className="w-full" disabled={submitting} onClick={() => setStage("camera")}><Camera className="mr-2 h-4 w-4" />Abrir câmera</Button>
            </>}
          </div><Button type="button" className="min-h-12 w-full shrink-0 rounded-2xl btn-gradient" disabled={submitting || videoEditor || (!file && !caption.trim())} onClick={() => void publish()}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando publicação...</> : "Publicar"}</Button></>}
      </DialogContent>
    </Dialog>
    <PhotoEditorDialog file={file?.type.startsWith("image/") ? file : null} open={photoEditor} onOpenChange={setPhotoEditor} onConfirm={async value => { choose(value); setPhotoEditor(false); }} />
  </>;
}
