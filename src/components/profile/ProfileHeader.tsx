import { ProfilePhotoPicker } from "./ProfilePhotoPicker";
import { PhotoEditorDialog } from "@/components/feed/PhotoEditorDialog";
import { useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";

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
  
  const [photoTarget, setPhotoTarget] = useState<"avatar" | "cover" | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const uploadCoverFile = async (file: File) => {

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/cover-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await onProfileUpdate({ cover_photo_url: publicUrl } as any);
      toast({ title: "Capa atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar capa", description: "Não foi possível enviar a imagem. Tente novamente.", variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const fileName = `${profile.id}/avatar-${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: false, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await onProfileUpdate({ photo_url: `${publicUrl}?t=${Date.now()}` });
      toast({ title: "Foto atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar foto", description: "Não foi possível enviar a imagem. Tente novamente.", variant: "destructive" });
      throw error;
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
      <ProfilePhotoPicker open={photoTarget !== null} onOpenChange={value => { if (!value) setPhotoTarget(null); }} onSelect={file => { if (photoTarget === "cover") setCoverFile(file); else { setPendingAvatarFile(file); setIsCropOpen(true); } }} />
      <PhotoEditorDialog file={coverFile} open={!!coverFile} onOpenChange={value => { if (!value) setCoverFile(null); }} onConfirm={async file => { await uploadCoverFile(file); setCoverFile(null); }} />
      {/* Cover Photo */}
      <div className="relative h-28 sm:h-40 bg-gradient-to-br from-muted to-muted-foreground/20 overflow-hidden">
        {(profile as any).cover_photo_url && (
          <img
            src={(profile as any).cover_photo_url}
            alt="Capa do perfil"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Cover upload button */}
        <button type="button" aria-label="Alterar capa do perfil" className="absolute top-[calc(var(--safe-top)_+_0.5rem)] right-2" disabled={uploadingCover} onClick={() => setPhotoTarget("cover")}>
          <div className={cn(
            "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground transition-colors hover:bg-background",
            uploadingCover && "animate-pulse"
          )}>
            <Camera className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Profile Info - Centered layout for mobile */}
      <div className="relative px-4 w-full">
        <div className="flex flex-col items-center -mt-12 sm:-mt-14">
          {/* Avatar */}
          <div className="relative">
            <div className="avatar-ring-gradient p-[3px] rounded-full">
              <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background">
                <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || "Usuário"} className="object-cover object-center" />
                <AvatarFallback
                  className="text-xl sm:text-2xl font-bold text-accent-foreground"
                  style={{ backgroundImage: "var(--gradient-social)" }}
                >
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Avatar upload button */}
            <button type="button" aria-label="Alterar foto do perfil" className="absolute bottom-0 right-0" disabled={uploadingAvatar} onClick={() => setPhotoTarget("avatar")}>
              <div className={cn(
                "h-7 w-7 rounded-full bg-background text-foreground border border-border flex items-center justify-center transition-transform hover:scale-110",
                uploadingAvatar && "animate-pulse"
              )}>
                <Camera className="h-3.5 w-3.5" />
              </div>
            </button>
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

        </div>
      </div>

      <AvatarCropDialog
        file={pendingAvatarFile}
        open={isCropOpen}
        onOpenChange={(open) => {
          setIsCropOpen(open);
          if (!open) setPendingAvatarFile(null);
        }}
        onConfirm={uploadAvatarFile}
        isSubmitting={uploadingAvatar}
      />
    </motion.div>
  );
}
