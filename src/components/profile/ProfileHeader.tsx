import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Settings, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      className="relative"
    >
      {/* Cover Photo */}
      <div className="relative h-32 sm:h-48 bg-gradient-to-br from-muted to-muted-foreground/20 overflow-hidden">
        {(profile as any).cover_photo_url && (
          <img
            src={(profile as any).cover_photo_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Cover upload button */}
        <label className="absolute top-3 right-3 cursor-pointer">
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

      {/* Profile Info */}
      <div className="container relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
          {/* Avatar */}
          <div className="relative">
            <div className="avatar-ring-gradient p-[3px] rounded-full">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
                <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || "User"} />
                <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-accent to-pink-500 text-white">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Avatar upload button */}
            <label className="absolute bottom-1 right-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <div className={cn(
                "h-8 w-8 rounded-full bg-background text-foreground border border-border flex items-center justify-center transition-transform hover:scale-110",
                uploadingAvatar && "animate-pulse"
              )}>
                <Camera className="h-4 w-4" />
              </div>
            </label>
          </div>

          {/* Name and Stats */}
          <div className="flex-1 text-center sm:text-left pb-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {profile.full_name || "Usuário"}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 sm:gap-8 pb-4">
            <div className="text-center">
              <div className="font-display text-xl font-bold text-foreground">{stats.events}</div>
              <div className="text-xs text-muted-foreground">Eventos</div>
            </div>
            <div className="text-center">
              <div className="font-display text-xl font-bold text-foreground">{stats.saved}</div>
              <div className="text-xs text-muted-foreground">Salvos</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
