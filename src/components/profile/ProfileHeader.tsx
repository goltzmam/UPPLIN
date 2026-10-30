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
  
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

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

  const uploadAvatarFile = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const fileName = `${profile.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await onProfileUpdate({ photo_url: `${publicUrl}?t=${Date.now()}` });
      toast({ title: "Foto atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar foto", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingAvatarFile(file);
    setIsCropOpen(true);
    e.target.value = "";
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
        <label className="absolute top-[calc(var(--safe-top)_+_0.5rem)] right-2 cursor-pointer">
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
                <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || "User"} className="object-cover object-center" />
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
