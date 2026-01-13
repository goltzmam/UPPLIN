import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Mail, Lock, User, Loader2, Building2, Phone, Globe, Instagram, Facebook, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function OrganizadorCadastro() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 - Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 - Company
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  // Step 3 - Social
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 14);
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user account using supabase directly to get the user data
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      
      if (authError) throw authError;

      // Wait for the user to be created
      if (authData?.user) {
        // Add organizer role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "organizer" });
        
        if (roleError && !roleError.message.includes("duplicate")) {
          console.error("Role error:", roleError);
        }

        // Create organizer account
        const { error: orgError } = await supabase
          .from("organizer_accounts")
          .insert({
            owner_user_id: authData.user.id,
            display_name: companyName,
            cnpj: cnpj.replace(/\D/g, ""),
            phone: phone.replace(/\D/g, ""),
            email: email,
            description,
            social_instagram: instagram,
            social_facebook: facebook,
            social_website: website,
          });

        if (orgError) throw orgError;
      }

      toast({ 
        title: "Conta criada com sucesso!", 
        description: "Bem-vindo à área de organizadores." 
      });
      navigate("/organizador");
    } catch (err: any) {
      toast({ 
        title: "Erro ao criar conta", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center lg:text-left">
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-6 sm:mb-8">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg sm:text-xl font-bold">Influente</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Building2 className="h-4 w-4" />
              Área do Organizador
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Criar conta de organizador</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Já tem conta?{" "}
              <Link to="/organizador/login" className="text-primary hover:underline font-medium">Entrar</Link>
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-muted"}`} />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Etapa {step} de 3: {step === 1 ? "Dados da conta" : step === 2 ? "Dados da empresa" : "Redes sociais"}
          </p>

          {/* Step 1: Account */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm">Seu nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" placeholder="Seu nome" className="pl-10 h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="seu@email.com" className="pl-10 h-11" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full h-11">Continuar</Button>
            </form>
          )}

          {/* Step 2: Company */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm">Nome da Produtora/Organizadora</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="companyName" placeholder="Ex: Eventos XYZ" className="pl-10 h-11" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-sm">CNPJ</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="cnpj" placeholder="00.000.000/0000-00" className="pl-10 h-11" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" placeholder="(00) 00000-0000" className="pl-10 h-11" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Descrição da empresa (opcional)</Label>
                <Textarea id="description" placeholder="Conte um pouco sobre sua empresa..." className="min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>Voltar</Button>
                <Button type="submit" className="flex-1 h-11">Continuar</Button>
              </div>
            </form>
          )}

          {/* Step 3: Social */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-sm">Instagram (opcional)</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="instagram" placeholder="@seuperfil" className="pl-10 h-11" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook" className="text-sm">Facebook (opcional)</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="facebook" placeholder="facebook.com/suapagina" className="pl-10 h-11" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm">Website (opcional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="website" placeholder="https://seusite.com" className="pl-10 h-11" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(2)}>Voltar</Button>
                <Button type="submit" className="flex-1 h-11" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta"}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center">
            <Link to="/cadastro" className="text-sm text-muted-foreground hover:text-primary">
              Cadastrar como participante →
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center text-secondary-foreground">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Comece a criar eventos incríveis</h1>
          <p className="text-sm sm:text-base text-secondary-foreground/70">
            Junte-se a milhares de organizadores que confiam na Influente para vender ingressos.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">2M+</div>
              <div className="text-xs text-secondary-foreground/60">Ingressos vendidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">50k+</div>
              <div className="text-xs text-secondary-foreground/60">Eventos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-xs text-secondary-foreground/60">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
