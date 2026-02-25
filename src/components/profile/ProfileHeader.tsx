import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Settings, Bell, Check, CalendarPlus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-user-roles";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  photo_url: string | null;
  cover_photo_url?: string | null;
}

interface ProfileHeaderProps {
  profile: Profile;
  stats: {
    events: number;
    saved: number;
  };
  onProfileUpdate: (updates: Partial<Profile>) => Promise<void>;
}

export function ProfileHeader({ profile, stats, onProfileUpdate }: ProfileHeaderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isOrganizer, isLoading: rolesLoading } = useUserRoles();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/cover-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await onProfileUpdate({ cover_photo_url: publicUrl } as any);
      toast({ title: "Capa atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar capa", description: error.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await onProfileUpdate({ photo_url: publicUrl });
      toast({ title: "Foto atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar foto", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full overflow-hidden"
    >
      {/* Cover Photo */}
      <div className="relative h-28 sm:h-40 bg-gradient-to-br from-muted to-muted-foreground/20 overflow-hidden">
        {(profile as any).cover_photo_url && (
          <img
            src={(profile as any).cover_photo_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Cover upload button */}
        <label className="absolute top-2 right-2 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
            disabled={uploadingCover}
          />
          <div className={cn(
            "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground transition-colors hover:bg-background",
            uploadingCover && "animate-pulse"
          )}>
            <Camera className="h-4 w-4" />
          </div>
        </label>
      </div>

      {/* Profile Info - Centered layout for mobile */}
      <div className="relative px-4 w-full">
        <div className="flex flex-col items-center -mt-12 sm:-mt-14">
          {/* Avatar */}
          <div className="relative">
            <div className="avatar-ring-gradient p-[3px] rounded-full">
              <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background">
                <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || "User"} />
                <AvatarFallback
                  className="text-xl sm:text-2xl font-bold text-accent-foreground"
                  style={{ backgroundImage: "var(--gradient-social)" }}
                >
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Avatar upload button */}
            <label className="absolute bottom-0 right-0 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <div className={cn(
                "h-7 w-7 rounded-full bg-background text-foreground border border-border flex items-center justify-center transition-transform hover:scale-110",
                uploadingAvatar && "animate-pulse"
              )}>
                <Camera className="h-3.5 w-3.5" />
              </div>
            </label>
          </div>

          {/* Name and Email */}
          <div className="mt-3 text-center w-full">
            <h1 className="font-display text-lg sm:text-xl font-bold text-foreground truncate px-4">
              {profile.full_name || "Usuário"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate px-4">{profile.email}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-4 pb-2">
            <div className="text-center">
              <div className="font-display text-lg sm:text-xl font-bold text-foreground">{stats.events}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">Eventos</div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg sm:text-xl font-bold text-foreground">{stats.saved}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">Salvos</div>
            </div>
          </div>

          {/* Organizer CTA - only for non-organizers */}
          {!rolesLoading && !isOrganizer && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate("/organizador/cadastro")}
              className="mt-4 w-full max-w-sm flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-muted/30 hover:bg-muted/60 transition-all group"
            >
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #FF6A00, #FF007A)" }}
              >
                <CalendarPlus className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">Quero ser organizador</p>
                <p className="text-xs text-muted-foreground">Crie e promova seus eventos</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </motion.button>
          )}

          {/* Organizer Dashboard Link */}
          {!rolesLoading && isOrganizer && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/organizador/painel")}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Painel do organizador
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
