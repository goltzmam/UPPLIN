import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MapPin, X, Users, Loader2, Upload, Video, Image, ChevronDown, Wand2 } from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { triggerHaptic } from "@/hooks/use-haptic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createUserPost, getPostMediaValidationError, invalidateSocialQueries } from "@/lib/social-posts";
import { PhotoEditorDialog } from "@/components/feed/PhotoEditorDialog";

interface UpActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpActionMenu({ isOpen, onClose }: UpActionMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [showEventPicker, setShowEventPicker] = useState(false);

  // Fetch user's upcoming events for tagging
  const { data: userEvents } = useQuery({
    queryKey: ["user-events-for-tagging", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          event_id,
          events:event_id (
            id,
            title,
            venue_name,
            start_at
          )
        `)
        .eq("buyer_user_id", user.id)
        .eq("status", "issued");
      
      if (error) throw error;
      
      const now = new Date();
      return data
        ?.map(t => t.events)
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .filter(e => new Date(e.start_at) >= new Date(now.getTime() - 24 * 60 * 60 * 1000))
        || [];
    },
    enabled: !!user && showPostDialog,
  });

  const handleAction = async (action: () => void | Promise<void>) => {
    triggerHaptic('selection');
    await action();
    onClose();
  };

  const handlePostSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await createUserPost({
        userId: user.id,
        content: postContent,
        file: selectedFile,
        eventId: selectedEventId || null,
      });

      await invalidateSocialQueries(queryClient, user.id);

      toast({ title: "Momento compartilhado! 🎉" });
      setShowPostDialog(false);
      setPostContent("");
      setSelectedFile(null);
      setSelectedEventId("");
      setShowEventPicker(false);
      navigate("/perfil?tab=posts");
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erro ao publicar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detect if user is on an event page
  const isOnEventPage = location.pathname.startsWith("/evento/");

  const handleShareApp = async () => {
    const isEventPage = isOnEventPage;
    const currentUrl = window.location.href;

    const shareData = isEventPage
      ? {
          title: "Confira este evento no UP!",
          text: "Vem comigo nesse rolê! 🎉",
          url: currentUrl,
        }
      : {
          title: "UP - Descubra eventos incríveis",
          text: "Vem descobrir os melhores rolês perto de você! 🎉",
          url: window.location.origin,
        };

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: "Link copiado! 📋" });
      } catch {
        // Fallback for insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = shareData.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast({ title: "Link copiado! 📋" });
      }
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: unknown) {
        // User cancelled or share failed — fallback to copy
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const selectedEvent = userEvents?.find(e => e.id === selectedEventId);

  const actions = [
    {
      icon: Camera,
      label: "Compartilhar momento",
      description: "Foto, vídeo ou check-in no evento",
      gradient: "from-[#FF6A00] to-[#FF2D2D]",
      onClick: () => {
        if (!user) { navigate("/login"); } 
        else { setShowPostDialog(true); }
      },
    },
    {
      icon: Users,
      label: isOnEventPage ? "Convidar para este evento" : "Convidar amigos",
      description: isOnEventPage ? "Compartilhe este evento com a galera" : "Compartilhe o app com a galera",
      gradient: "from-[#FF007A] to-[#FF6A00]",
      onClick: () => handleShareApp(),
    },
  ];

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] rounded-t-3xl overflow-hidden"
            style={{ boxShadow: "0 -10px 40px rgba(255, 45, 45, 0.2)" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
                  >
                    UP
                  </span>
                </h2>
                <p className="text-sm text-white/50">O que você quer fazer?</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-4 pb-8 space-y-3">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleAction(action.onClick)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    <div 
                      className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} shadow-lg`}
                      style={{ boxShadow: "0 4px 20px rgba(255, 45, 45, 0.3)" }}
                    >
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white group-hover:text-white/90 transition-colors">
                        {action.label}
                      </p>
                      <p className="text-sm text-white/40">{action.description}</p>
                    </div>
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,106,0,0.05), transparent)" }}
                    />
                  </motion.button>
                );
              })}
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Unified Post Dialog with Event Tagging */}
    <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar momento</DialogTitle>
          <DialogDescription>
              Publique texto, imagem ou vídeo. Marcar um evento é opcional.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File upload */}
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl overflow-hidden text-center">
            {selectedFile ? (
              <div className="space-y-2">
                {/* Media Preview */}
                <div className="relative w-full bg-black/20">
                  {selectedFile.type.startsWith('video/') ? (
                    <video
                      src={URL.createObjectURL(selectedFile)}
                      className="w-full max-h-52 object-contain mx-auto"
                      controls
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full max-h-52 object-contain mx-auto"
                    />
                  )}
                  {selectedFile.type.startsWith('image/') && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditorFile(selectedFile);
                        setShowEditor(true);
                      }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-medium hover:bg-black/90 transition-colors"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  )}
                </div>
                <div className="px-4 pb-3 pt-1">
                  <p className="text-xs text-muted-foreground truncate">{selectedFile.name}</p>
                  <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setSelectedFile(null)}>
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const validationError = getPostMediaValidationError(file);
                        if (validationError) {
                          toast({ title: "Arquivo inválido", description: validationError, variant: "destructive" });
                          return;
                        }
                      if (file.type.startsWith('image/')) {
                        setEditorFile(file);
                        setShowEditor(true);
                      } else {
                        setSelectedFile(file);
                      }
                    }
                    // allow re-picking same file
                    e.target.value = "";
                  }}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar imagem ou vídeo vertical
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Imagens podem ser editadas (cortar, ajustar, filtros)
                </p>
              </label>
            )}
          </div>

          {/* Event Tag Picker */}
          <div>
            <button
              type="button"
              onClick={() => setShowEventPicker(!showEventPicker)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                selectedEventId 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <MapPin className={cn("h-5 w-5 shrink-0", selectedEventId ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                {selectedEvent ? (
                  <>
                    <p className="text-sm font-medium truncate">{selectedEvent.title}</p>
                    {selectedEvent.venue_name && (
                      <p className="text-xs text-muted-foreground truncate">{selectedEvent.venue_name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Marcar evento (check-in)</p>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showEventPicker && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showEventPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedEventId && (
                      <button
                        onClick={() => { setSelectedEventId(""); setShowEventPicker(false); }}
                        className="w-full p-2.5 rounded-lg text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Remover marcação
                      </button>
                    )}
                    {userEvents && userEvents.length > 0 ? (
                      userEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => { setSelectedEventId(event.id); setShowEventPicker(false); }}
                          className={cn(
                            "w-full p-2.5 rounded-lg text-left transition-all",
                            selectedEventId === event.id
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {event.venue_name && (
                            <p className="text-xs text-muted-foreground truncate">{event.venue_name}</p>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhum evento disponível para marcar
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text content */}
          <Textarea
            placeholder="Escreva uma legenda... (opcional)"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={3}
          />

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handlePostSubmit}
            disabled={isSubmitting || (!selectedFile && !postContent.trim())}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {selectedEventId ? "Publicar com check-in" : "Publicar"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
