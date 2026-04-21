import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { User, Mail, CreditCard, Loader2, AlertCircle, LogOut, RefreshCw, Ticket, Bookmark, Search, ChevronRight, Camera, ImageIcon, CalendarPlus, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRoles } from "@/hooks/use-user-roles";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  photo_url: string | null;
  cover_photo_url?: string | null;
  cpf?: string | null;
  cpf_locked?: boolean;
  city?: string | null;
  state?: string | null;
}

interface ProfileSettingsProps {
  profile: Profile;
  onProfileUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileSettings({ profile, onProfileUpdate }: ProfileSettingsProps) {
  const { logout, loggingOut } = useLogout({ redirectTo: "/" });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOrganizer, isLoading: rolesLoading } = useUserRoles();
  
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [cpf, setCpf] = useState(profile.cpf || "");
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const updates: any = {
      full_name: fullName,
      city: city.trim() || null,
      state: state.trim().toUpperCase().slice(0, 2) || null,
    };
    
    if (!profile.cpf && cpf) {
      updates.cpf = cpf.replace(/\D/g, "");
    }

    const { error } = await onProfileUpdate(updates);
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await onProfileUpdate({ photo_url: photoUrl });
      toast({ title: "Foto atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/cover.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await onProfileUpdate({ cover_photo_url: coverUrl });
      toast({ title: "Capa atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao enviar capa", description: error.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };


  const cpfLocked = !!profile.cpf && profile.cpf_locked;

  // Only show participant-relevant links (no organizer access)
  const quickLinks = [
    { icon: Ticket, label: "Meus Ingressos", path: "/meus-ingressos", description: "Ver todos os ingressos" },
    { icon: Bookmark, label: "Eventos Salvos", path: "/eventos-salvos", description: "Eventos que você salvou" },
    { icon: Search, label: "Explorar Eventos", path: "/eventos", description: "Descobrir novos eventos" },
    ...(!rolesLoading && !isOrganizer ? [{ icon: CalendarPlus, label: "Quero ser organizador", path: "/organizador/cadastro", description: "Crie e promova seus eventos" }] : []),
    ...(!rolesLoading && isOrganizer ? [{ icon: CalendarPlus, label: "Painel do organizador", path: "/organizador/painel", description: "Gerencie seus eventos" }] : []),
  ];

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Profile Photos Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <h3 className="font-display font-semibold text-lg px-4 sm:px-6 pt-4 sm:pt-6 pb-3">Foto do Perfil</h3>
        
        {/* Cover Photo */}
        <div className="px-4 sm:px-6 pb-4">
          <div 
            className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20 cursor-pointer group"
            onClick={() => coverInputRef.current?.click()}
          >
            {profile.cover_photo_url ? (
              <img 
                src={profile.cover_photo_url} 
                alt="Capa" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingCover ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Clique para trocar a foto de capa</p>
        </div>

        {/* Avatar */}
        <div className="px-4 sm:px-6 pb-6 flex flex-col items-center">
          <div 
            className="relative cursor-pointer group"
            onClick={() => photoInputRef.current?.click()}
          >
            <Avatar className="h-24 w-24 ring-4 ring-background">
              <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || "User"} />
              <AvatarFallback className="bg-foreground text-background text-2xl font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingPhoto ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Clique para trocar a foto de perfil</p>
        </div>
      </div>

      {/* Quick Links Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <h3 className="font-display font-semibold text-lg px-4 sm:px-6 pt-4 sm:pt-6 pb-3">Acesso Rápido</h3>
        <div className="divide-y divide-border">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                <link.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">{link.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Profile Data Card */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold text-lg">Dados Pessoais</h3>
        
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={profile.email} className="pl-10 bg-muted" disabled />
          </div>
        </div>

        {/* CPF */}
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cpf"
              value={cpf}
              onChange={handleCpfChange}
              className={`pl-10 ${cpfLocked ? "bg-muted" : ""}`}
              placeholder="000.000.000-00"
              disabled={cpfLocked}
            />
          </div>
          {cpfLocked && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O CPF não pode ser alterado.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* City + State */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="city">Cidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10"
                placeholder="Ex: Fortaleza"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="CE"
              maxLength={2}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Usamos sua cidade para mostrar eventos da sua região quando o GPS não estiver disponível.
        </p>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Alterações
        </Button>
      </div>


      {/* Account Actions */}
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full"
          disabled={loggingOut}
          onClick={() => logout({ redirectTo: "/login", showToast: false })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Trocar Conta
        </Button>

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          disabled={loggingOut}
          onClick={() => logout({ redirectTo: "/" })}
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          {loggingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
    </div>
  );
}
