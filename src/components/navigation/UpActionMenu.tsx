import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, CalendarPlus, MapPin, X, Sparkles, Image, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { triggerHaptic } from "@/hooks/use-haptic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UpActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpActionMenu({ isOpen, onClose }: UpActionMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOrganizer, isLoading: rolesLoading } = useUserRoles();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // Fetch user's upcoming events for check-in
  const { data: userEvents } = useQuery({
    queryKey: ["user-events-for-checkin", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get events the user has tickets to
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
      
      // Filter for events happening today or in the near future
      const now = new Date();
      return data
        ?.map(t => t.events)
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .filter(e => new Date(e.start_at) >= new Date(now.getTime() - 12 * 60 * 60 * 1000)) // within last 12h
        || [];
    },
    enabled: !!user && showCheckInDialog,
  });

  const handleAction = (action: () => void) => {
    triggerHaptic('selection');
    onClose();
    action();
  };

  const handlePostSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const isVideo = selectedFile.type.startsWith('video/');
        
        const { error: uploadError } = await supabase.storage
          .from("user-posts")
          .upload(fileName, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("user-posts")
          .getPublicUrl(fileName);
        
        mediaUrl = publicUrl;
        mediaType = isVideo ? "video" : "image";
      }

      // Create post
      const { error } = await supabase
        .from("user_posts")
        .insert({
          user_id: user.id,
          content: postContent || null,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) throw error;

      setShowPostDialog(false);
      setPostContent("");
      setSelectedFile(null);
      navigate("/perfil?tab=posts");
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !selectedEventId) return;

    setIsSubmitting(true);
    try {
      // Create a check-in post
      const selectedEvent = userEvents?.find(e => e.id === selectedEventId);
      
      const { error } = await supabase
        .from("user_posts")
        .insert({
          user_id: user.id,
          event_id: selectedEventId,
          content: `📍 Check-in no evento: ${selectedEvent?.title || 'Evento'}`,
        });

      if (error) throw error;

      setShowCheckInDialog(false);
      setSelectedEventId("");
      navigate("/perfil?tab=checkins");
    } catch (error) {
      console.error("Error doing check-in:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define action type
  type ActionItem = {
    icon: typeof Video;
    label: string;
    description: string;
    gradient: string;
    onClick: () => void;
    highlight?: boolean;
  };

  // Build actions based on user role - only show organizer features to organizers
  const actions: ActionItem[] = [
    {
      icon: Video,
      label: "Postar vídeo do rolê",
      description: "Compartilhe o momento",
      gradient: "from-[#FF6A00] to-[#FF2D2D]",
      onClick: () => {
        if (!user) {
          navigate("/login");
        } else {
          setShowPostDialog(true);
        }
      },
    },
    {
      icon: MapPin,
      label: "Check-in",
      description: "Estou aqui agora",
      gradient: "from-[#FF007A] to-[#FF6A00]",
      onClick: () => {
        if (!user) {
          navigate("/login");
        } else {
          setShowCheckInDialog(true);
        }
      },
    },
  ];

  // Only show organizer-related option if user is NOT already an organizer (for participant conversion)
  // OR if they ARE an organizer (to go to dashboard)
  if (!rolesLoading) {
    if (isOrganizer) {
      actions.push({
        icon: CalendarPlus,
        label: "Gerenciar eventos",
        description: "Ir para o painel do organizador",
        gradient: "from-[#FF2D2D] to-[#FF007A]",
        onClick: () => {
          navigate("/organizador/painel");
        },
      });
    } else {
      actions.push({
        icon: CalendarPlus,
        label: "Quero ser organizador",
        description: "Crie e promova seus eventos",
        gradient: "from-[#FF2D2D] to-[#FF007A]",
        onClick: () => {
          navigate("/organizador/cadastro");
        },
        highlight: true,
      });
    }
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] rounded-t-3xl overflow-hidden"
            style={{
              boxShadow: "0 -10px 40px rgba(255, 45, 45, 0.2)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                    }}
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

            {/* Actions */}
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
                    {/* Icon with gradient background */}
                    <div 
                      className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} shadow-lg`}
                      style={{
                        boxShadow: `0 4px 20px rgba(255, 45, 45, 0.3)`,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white group-hover:text-white/90 transition-colors">
                        {action.label}
                      </p>
                      <p className="text-sm text-white/40">
                        {action.description}
                      </p>
                    </div>

                    {/* Highlight badge for "become organizer" */}
                    {action.highlight && (
                      <span 
                        className="px-2 py-1 text-xs font-bold rounded-full text-white"
                        style={{
                          background: "linear-gradient(135deg, #FF6A00, #FF007A)",
                        }}
                      >
                        PRO
                      </span>
                    )}

                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,106,0,0.05), transparent)`,
                      }}
                    />
                  </motion.button>
                );
              })}
            </div>

            {/* Safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Post Dialog */}
    <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar momento</DialogTitle>
          <DialogDescription>
            Poste uma foto ou vídeo do seu rolê
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File upload */}
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center">
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary">
                  {selectedFile.type.startsWith('video/') ? (
                    <Video className="h-8 w-8" />
                  ) : (
                    <Image className="h-8 w-8" />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remover
                </Button>
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
                      if (file.size > 50 * 1024 * 1024) {
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar foto ou vídeo
                </p>
              </label>
            )}
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
              "Publicar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Check-in Dialog */}
    <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📍 Fazer Check-in</DialogTitle>
          <DialogDescription>
            Mostre que você está em um evento agora
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {userEvents && userEvents.length > 0 ? (
            <>
              <div className="space-y-2">
                {userEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all",
                      selectedEventId === event.id 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <p className="font-semibold">{event.title}</p>
                    {event.venue_name && (
                      <p className="text-sm text-muted-foreground">{event.venue_name}</p>
                    )}
                  </button>
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleCheckIn}
                disabled={isSubmitting || !selectedEventId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fazendo check-in...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Confirmar Check-in
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Você não tem ingressos para eventos no momento.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setShowCheckInDialog(false);
                  navigate("/eventos");
                }}
              >
                Explorar eventos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
