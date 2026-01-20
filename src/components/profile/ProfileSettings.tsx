import { useState } from "react";
import { User, Mail, CreditCard, Loader2, AlertCircle, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  photo_url: string | null;
  cpf?: string | null;
  cpf_locked?: boolean;
}

interface ProfileSettingsProps {
  profile: Profile;
  onProfileUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileSettings({ profile, onProfileUpdate }: ProfileSettingsProps) {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { isSupported, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [cpf, setCpf] = useState(profile.cpf || "");
  const [saving, setSaving] = useState(false);

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
    
    const updates: any = { full_name: fullName };
    
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

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const cpfLocked = !!profile.cpf && profile.cpf_locked;

  return (
    <div className="space-y-6 max-w-md mx-auto">
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

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Alterações
        </Button>
      </div>

      {/* Notifications Card */}
      {isSupported && (
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">Notificações</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Notificações Push</p>
                <p className="text-xs text-muted-foreground">
                  Receba alertas de eventos salvos
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleNotificationToggle}
              disabled={pushLoading}
            />
          </div>
        </div>
      )}

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
}
