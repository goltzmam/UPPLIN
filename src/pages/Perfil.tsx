import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, CreditCard, Camera, Loader2, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Perfil() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
    if (profile) {
      setFullName(profile.full_name || "");
      setCpf(profile.cpf || "");
      setPhotoUrl(profile.photo_url || "");
    }
  }, [loading, user, profile, navigate]);

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
    
    // Only update CPF if it's not set yet
    if (!profile?.cpf && cpf) {
      updates.cpf = cpf.replace(/\D/g, "");
    }

    if (photoUrl !== profile?.photo_url) {
      updates.photo_url = photoUrl;
    }

    const { error } = await updateProfile(updates);
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
      await refreshProfile();
    }
  };

  if (loading) return <><Header /><PageLoading /><Footer /></>;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const cpfLocked = !!profile?.cpf && profile?.cpf_locked;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-8">Meu Perfil</h1>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-6 animate-fade-up">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="photoUrl">URL da Foto</Label>
                <Input
                  id="photoUrl"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

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
                <Input value={profile?.email || ""} className="pl-10 bg-muted" disabled />
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
                    O CPF não pode ser alterado. Para corrigir, solicite alteração ao suporte.
                  </AlertDescription>
                </Alert>
              )}
              {!profile?.cpf && (
                <p className="text-sm text-muted-foreground">
                  O CPF é necessário para emissão de ingressos e não poderá ser alterado depois.
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
