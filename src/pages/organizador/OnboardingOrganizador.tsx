import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ArrowRight, Loader2, Camera, Sparkles, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput } from "@/components/ui/validated-input";
import { AvatarUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/ui/loading";
import { isValidCNPJ, isValidPhone, formatCNPJ, formatPhone } from "@/lib/validation";

export default function OnboardingOrganizador() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  const cnpjRules = useMemo(() => [{ test: isValidCNPJ }], []);
  const phoneRules = useMemo(() => [{ test: isValidPhone }], []);
  const companyRules = useMemo(() => [{ test: (v: string) => v.trim().length >= 2 }], []);

  // Get organizer account
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

  // If organizer account already exists with company data, go to dashboard
  useEffect(() => {
    if (organizer && organizer.cnpj && organizer.display_name) {
      navigate("/organizador/painel", { replace: true });
    }
  }, [organizer, navigate]);

  useEffect(() => {
    if (organizer) {
      setCompanyName(organizer.display_name || "");
      setCnpj(organizer.cnpj ? formatCNPJ(organizer.cnpj) : "");
      setPhone(organizer.phone ? formatPhone(organizer.phone) : "");
      setLogoUrl(organizer.logo_url || "");
      setDescription(organizer.description || "");
      setInstagram(organizer.social_instagram || "");
      setFacebook(organizer.social_facebook || "");
      setWebsite(organizer.social_website || "");
    }
  }, [organizer]);

  const isStep1Valid = companyName.trim().length >= 2 && isValidCNPJ(cnpj) && isValidPhone(phone);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleCreateAndFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (organizer) {
        // Update existing
        const { error } = await supabase
          .from("organizer_accounts")
          .update({
            display_name: companyName,
            cnpj: cnpj.replace(/\D/g, ""),
            phone: phone.replace(/\D/g, ""),
            logo_url: logoUrl || null,
            description: description || null,
            social_instagram: instagram || null,
            social_facebook: facebook || null,
            social_website: website || null,
          })
          .eq("id", organizer.id);
        if (error) throw error;
      } else {
        // Create new organizer account
        // First add organizer role (ignore if duplicate)
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "organizer" });
        if (roleError && !roleError.message.includes("duplicate")) {
          console.warn("Role insert warning:", roleError);
        }

        const { error } = await supabase
          .from("organizer_accounts")
          .insert({
            owner_user_id: user.id,
            display_name: companyName,
            cnpj: cnpj.replace(/\D/g, ""),
            phone: phone.replace(/\D/g, ""),
            email: user.email,
            logo_url: logoUrl || null,
            description: description || null,
            social_instagram: instagram || null,
            social_facebook: facebook || null,
            social_website: website || null,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["organizer-account"] });
      toast({ title: "Perfil atualizado!", description: "Vamos criar seu primeiro evento?" });
      navigate("/organizador/painel");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || orgLoading) return <PageLoading />;

  const steps = [
    { number: 1, title: "Empresa", icon: Building2 },
    { number: 2, title: "Logo", icon: Camera },
    { number: 3, title: "Redes", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border py-6 pt-[calc(var(--safe-top)_+_1.5rem)]">
        <div className="container px-4">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Complete seu cadastro</h1>
              <p className="text-sm text-muted-foreground">Configure sua conta de organizador</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    step >= s.number
                      ? "text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  style={step >= s.number ? { background: "linear-gradient(135deg, #10B981, #06B6D4)" } : {}}
                >
                  {step > s.number ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${step >= s.number ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5" style={step > s.number ? { background: "#10B981" } : { background: "var(--muted)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          {/* Step 1: Company Data */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-up">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold mb-2">Dados da Empresa</h2>
                <p className="text-muted-foreground text-sm">Informações obrigatórias para criar eventos</p>
              </div>
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <ValidatedInput
                  placeholder="Ex: Eventos XYZ"
                  className="h-11"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  icon={<Building2 className="h-4 w-4" />}
                  validationRules={companyRules}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <ValidatedInput
                  placeholder="00.000.000/0000-00"
                  className="h-11"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  icon={<FileText className="h-4 w-4" />}
                  validationRules={cnpjRules}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <ValidatedInput
                  placeholder="(00) 00000-0000"
                  className="h-11"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  icon={<Phone className="h-4 w-4" />}
                  validationRules={phoneRules}
                />
              </div>
            </div>
          )}

          {/* Step 2: Logo */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold mb-2">Logo da Produtora</h2>
                <p className="text-muted-foreground text-sm">Opcional — personalize sua página</p>
              </div>
              <div className="flex justify-center">
                <AvatarUpload
                  userId={user?.id || "temp"}
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url || "")}
                  size="lg"
                  fallback={companyName?.charAt(0) || "O"}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Recomendado: Imagem quadrada de pelo menos 400x400px
              </p>
            </div>
          )}

          {/* Step 3: Social & Description */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-up">
              <div className="text-center mb-2">
                <h2 className="font-display text-2xl font-bold mb-2">Redes Sociais</h2>
                <p className="text-muted-foreground text-sm">Opcional — conecte suas redes</p>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Conte um pouco sobre sua empresa..."
                  className="min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input placeholder="@seuinstagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input placeholder="facebook.com/suapagina" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input placeholder="https://seusite.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={handleBack}>
                Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button
                className="flex-1 h-12 text-white"
                style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
                onClick={handleNext}
                disabled={step === 1 && !isStep1Valid}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-12 text-white"
                style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
                onClick={handleCreateAndFinish}
                disabled={saving || !isStep1Valid}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    Finalizar
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
