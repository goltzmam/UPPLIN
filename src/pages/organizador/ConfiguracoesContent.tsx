import { useState, useCallback, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Upload, Loader2, Instagram, Globe, Facebook, MapPin, CreditCard, CheckCircle2, ExternalLink, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { translateCpfError } from "@/lib/cpfErrors";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from "@/lib/validation";

type DocumentType = "cpf" | "cnpj";

export default function ConfiguracoesContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(organizer?.display_name || "");
  const [description, setDescription] = useState(organizer?.description || "");
  const [email, setEmail] = useState(organizer?.email || "");
  const [phone, setPhone] = useState(organizer?.phone || "");
  const [instagram, setInstagram] = useState(organizer?.social_instagram || "");
  const [facebook, setFacebook] = useState(organizer?.social_facebook || "");
  const [website, setWebsite] = useState(organizer?.social_website || "");
  const [logoUrl, setLogoUrl] = useState(organizer?.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Document (CPF or CNPJ)
  const initialDocType: DocumentType = organizer?.cpf ? "cpf" : "cnpj";
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [cpf, setCpf] = useState(organizer?.cpf || "");
  const [cnpj, setCnpj] = useState(organizer?.cnpj || "");

  // Address fields
  const [cep, setCep] = useState(organizer?.cep || "");
  const [street, setStreet] = useState(organizer?.street || "");
  const [streetNumber, setStreetNumber] = useState(organizer?.street_number || "");
  const [complement, setComplement] = useState(organizer?.complement || "");
  const [neighborhood, setNeighborhood] = useState(organizer?.neighborhood || "");
  const [city, setCity] = useState(organizer?.city || "");
  const [state, setState] = useState(organizer?.state || "");
  const [loadingCep, setLoadingCep] = useState(false);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return digits.replace(/(\d{5})(\d)/, "$1-$2");
    return digits;
  };

  const fetchCep = useCallback(async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setLoadingCep(false);
    }
  }, [toast]);

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setCep(formatted);
    if (value.replace(/\D/g, "").length === 8) {
      fetchCep(value);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate document
      const documentValue = docType === "cpf" ? cpf : cnpj;
      if (!documentValue || documentValue.replace(/\D/g, "").length === 0) {
        throw new Error("CPF ou CNPJ é obrigatório");
      }
      if (docType === "cpf" && !isValidCPF(cpf)) {
        throw new Error("CPF inválido");
      }
      if (docType === "cnpj" && !isValidCNPJ(cnpj)) {
        throw new Error("CNPJ inválido");
      }

      const { error } = await supabase
        .from("organizer_accounts")
        .update({
          display_name: displayName,
          description,
          email,
          phone,
          cpf: docType === "cpf" ? cpf : null,
          cnpj: docType === "cnpj" ? cnpj : null,
          social_instagram: instagram,
          social_facebook: facebook,
          social_website: website,
          logo_url: logoUrl,
          cep: cep.replace(/\D/g, ""),
          street,
          street_number: streetNumber,
          complement,
          neighborhood,
          city,
          state,
        } as any)
        .eq("id", organizer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-account"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: any) => {
      if (docType === "cpf") {
        const { title, description } = translateCpfError(err, "profile");
        toast({ title, description, variant: "destructive" });
      } else {
        toast({
          title: "Erro ao salvar",
          description: err?.message || "Não foi possível salvar as configurações. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organizer.id}-logo.${fileExt}`;
      const filePath = `organizers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("event-images").getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
      toast({ title: "Logo atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu perfil de organizador</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      {/* Logo & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Informações públicas do seu perfil de organizador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logoUrl || undefined} />
              <AvatarFallback className="text-lg">
                {displayName?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="logo" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Alterar logo
                </div>
              </Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG ou JPG, máx. 2MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nome do Organizador</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome da sua empresa ou marca"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte um pouco sobre você ou sua empresa..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Informações de contato para seus participantes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Document: CPF or CNPJ */}
          <div className="space-y-3">
            <Label>Documento <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={docType === "cpf" ? "default" : "outline"}
                onClick={() => setDocType("cpf")}
              >
                CPF
              </Button>
              <Button
                type="button"
                size="sm"
                variant={docType === "cnpj" ? "default" : "outline"}
                onClick={() => setDocType("cnpj")}
              >
                CNPJ
              </Button>
            </div>
            {docType === "cpf" ? (
              <div className="space-y-1">
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {cpf && cpf.replace(/\D/g, "").length === 11 && !isValidCPF(cpf) && (
                  <p className="text-xs text-destructive">CPF inválido</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {cnpj && cnpj.replace(/\D/g, "").length === 14 && !isValidCNPJ(cnpj) && (
                  <p className="text-xs text-destructive">CNPJ inválido</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
          <CardDescription>Endereço do organizador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street">Rua / Logradouro</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Nome da rua"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="streetNumber">Número</Label>
              <Input
                id="streetNumber"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Sala 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">Estado (UF)</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle>Redes Sociais</CardTitle>
          <CardDescription>Links para suas redes sociais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@seuusuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook" className="flex items-center gap-2">
              <Facebook className="h-4 w-4" />
              Facebook
            </Label>
            <Input
              id="facebook"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="facebook.com/suapagina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://seusite.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mercado Pago Integration */}
      <MercadoPagoCard />

      {/* Save Button (mobile) */}
      <div className="sm:hidden">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

function MercadoPagoCard() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const { data: mpStatus, isLoading } = useQuery({
    queryKey: ["mp-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mp-connect", {
        body: {},
        headers: {},
      });
      // Use query params approach
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-connect?action=status`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to check status");
      return res.json();
    },
  });

  useEffect(() => {
    if (searchParams.get("mp") === "connected") {
      toast({ title: "Mercado Pago conectado com sucesso! ✅" });
    }
  }, [searchParams, toast]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-connect?action=auth-url`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Erro ao gerar link");
      const { auth_url } = await res.json();
      window.location.href = auth_url;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Mercado Pago
        </CardTitle>
        <CardDescription>
          Conecte sua conta do Mercado Pago para receber pagamentos dos ingressos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão...
          </div>
        ) : mpStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm text-primary">Conta conectada</p>
                {mpStatus.email && (
                  <p className="text-xs text-muted-foreground">{mpStatus.email}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para vender ingressos e receber pagamentos, conecte sua conta do Mercado Pago.
              A UPPLIN cobra uma comissão de <strong>10%</strong> por ingresso vendido.
            </p>

            

            <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Conectar Mercado Pago
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MercadoPagoOnboarding() {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-connect?action=callback`;

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      toast({ title: "Redirect URI copiada!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Antes de conectar: configure seu app no Mercado Pago</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <p className="text-sm font-medium">Acesse o painel de desenvolvedor</p>
            </div>
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-8"
            >
              Abrir painel do Mercado Pago <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              <p className="text-sm font-medium">Crie ou selecione um app do tipo correto</p>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              O app deve ser do tipo <strong>“Marketplace” / “Plataforma”</strong>. Apps comuns (de uma única loja) não permitem conectar contas de organizadores via OAuth.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              <p className="text-sm font-medium">Cadastre a Redirect URI exatamente assim</p>
            </div>
            <div className="ml-8 space-y-1">
              <div className="flex items-stretch gap-2">
                <code className="flex-1 text-[11px] sm:text-xs bg-background border border-border rounded-lg px-3 py-2 break-all font-mono">
                  {redirectUri}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyRedirect}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deve incluir <code className="font-mono">?action=callback</code> ao final. Sem isso o login falha com “aplicativo não está pronto”.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
              <p className="text-sm font-medium">Ative o app em modo produção</p>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              Em <em>“Detalhes do app”</em> verifique se o status está como <strong>Ativo</strong> e não em <em>rascunho</em>. Apps em rascunho não aceitam OAuth de terceiros.
            </p>
          </div>

          {/* Step 5 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span>
              <p className="text-sm font-medium">Volte aqui e clique em “Conectar Mercado Pago”</p>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              Você será redirecionado ao Mercado Pago para autorizar a UPPLIN a processar pagamentos em seu nome.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Se aparecer <strong>“O aplicativo não está pronto para se conectar a Mercado Pago”</strong>, revise os passos 2, 3 e 4 — geralmente é a Redirect URI digitada incorretamente ou o app ainda inativo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
