import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, Check, ArrowRight, Loader2, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/ui/loading";

export default function OnboardingOrganizador() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  // Get organizer
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["organizer-account", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/organizador/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (organizer) {
      setLogoUrl(organizer.logo_url || "");
      setDescription(organizer.description || "");
      setInstagram(organizer.social_instagram || "");
      setFacebook(organizer.social_facebook || "");
      setWebsite(organizer.social_website || "");
    }
  }, [organizer]);

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    if (!organizer) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("organizer_accounts")
        .update({
          logo_url: logoUrl || null,
          description: description || null,
          social_instagram: instagram || null,
          social_facebook: facebook || null,
          social_website: website || null,
        })
        .eq("id", organizer.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["organizer-account"] });

      toast({
        title: "Perfil atualizado!",
        description: "Vamos criar seu primeiro evento?",
      });

      navigate("/organizador");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || orgLoading) {
    return <PageLoading />;
  }

  if (!organizer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Conta de organizador não encontrada.</p>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Logo", icon: Camera },
    { number: 2, title: "Descrição", icon: Building2 },
    { number: 3, title: "Redes", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border py-6">
        <div className="container px-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Bem-vindo, {organizer.display_name}!</h1>
              <p className="text-sm text-muted-foreground">Vamos configurar sua conta de organizador</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    step >= s.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${step >= s.number ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${step > s.number ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          {/* Step 1: Logo */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold mb-2">Logo da Produtora</h2>
                <p className="text-muted-foreground">
                  Adicione o logo da sua empresa para personalizar sua página
                </p>
              </div>

              <div className="flex justify-center">
                <AvatarUpload
                  userId={organizer.id}
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url || "")}
                  size="lg"
                  fallback={organizer.display_name?.charAt(0) || "O"}
                />
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Recomendado: Imagem quadrada de pelo menos 400x400px
              </p>
            </div>
          )}

          {/* Step 2: Description */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold mb-2">Sobre sua Produtora</h2>
                <p className="text-muted-foreground">
                  Conte um pouco sobre sua empresa para os participantes
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Ex: Produtora de eventos especializada em shows e festivais de música eletrônica no Brasil..."
                    className="min-h-[150px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Social */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold mb-2">Redes Sociais</h2>
                <p className="text-muted-foreground">
                  Conecte suas redes para maior visibilidade
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="@seuinstagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="facebook.com/suapagina"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://seusite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={handleBack}
              >
                Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button className="flex-1 h-12" onClick={handleNext}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button className="flex-1 h-12" onClick={handleFinish} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Finalizar
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Skip */}
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => navigate("/organizador")}
            >
              Pular por agora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
