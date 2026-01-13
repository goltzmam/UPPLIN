import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, CreditCard, Loader2, AlertCircle, Heart, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarUpload } from "@/components/ui/image-upload";
import { EventCard } from "@/components/events/EventCard";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Perfil() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>("");
  const [saving, setSaving] = useState(false);

  // Fetch saved events
  const { data: savedEvents, isLoading: savedLoading } = useQuery({
    queryKey: ["saved-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          event_id,
          events:event_id (
            id,
            title,
            cover_image_url,
            start_at,
            venue_name,
            address_text,
            ticket_types(price_cents)
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

      <main className="flex-1 py-8 pt-24">
        <div className="container max-w-3xl px-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Meu Perfil</h1>

          <Tabs defaultValue="dados" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados">
                <User className="h-4 w-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="salvos">
                <Heart className="h-4 w-4 mr-2" />
                Salvos
              </TabsTrigger>
            </TabsList>

            {/* Dados Tab */}
            <TabsContent value="dados">
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-6 animate-fade-up">
                {/* Avatar Upload */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <AvatarUpload
                    userId={user?.id || ""}
                    value={photoUrl}
                    onChange={(url) => setPhotoUrl(url)}
                    fallback={getInitials(fullName)}
                    size="lg"
                  />
                  <div className="text-center sm:text-left">
                    <p className="font-medium text-lg">{fullName || "Seu nome"}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique na foto para alterar</p>
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
            </TabsContent>

            {/* Salvos Tab */}
            <TabsContent value="salvos">
              <div className="animate-fade-up">
                {savedLoading ? (
                  <PageLoading />
                ) : savedEvents && savedEvents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedEvents.map((saved: any) => {
                      const event = saved.events;
                      if (!event) return null;
                      
                      const minPrice = event.ticket_types?.length
                        ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
                        : 0;
                      
                      return (
                        <EventCard
                          key={saved.id}
                          id={event.id}
                          title={event.title}
                          coverImageUrl={event.cover_image_url}
                          startAt={event.start_at}
                          venueName={event.venue_name}
                          addressText={event.address_text}
                          minPrice={minPrice}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Heart className="h-8 w-8 text-muted-foreground" />}
                    title="Nenhum evento salvo"
                    description="Salve eventos para acompanhá-los facilmente."
                    action={
                      <Button asChild>
                        <Link to="/eventos">Explorar Eventos</Link>
                      </Button>
                    }
                    className="py-12"
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
