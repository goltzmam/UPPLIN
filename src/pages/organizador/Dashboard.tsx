import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, BarChart3, Ticket, Users, TrendingUp, MoreVertical, Edit, Eye, QrCode, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function OrganizerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

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

  // Get events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["organizer-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, slug, ticket_types(quantity_total, quantity_sold, price_cents)`)
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  const { data: issuedTickets } = useQuery({
    queryKey: ["organizer-issued-tickets-legacy-dashboard", organizer?.id, events?.length],
    queryFn: async () => {
      const eventIds = (events || []).map((e: any) => e.id);
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("id, event_id")
        .in("event_id", eventIds)
        .eq("status", "issued");
      if (error) throw error;
      return data;
    },
    enabled: !!events && events.length > 0,
  });

  const { data: paidOrders } = useQuery({
    queryKey: ["organizer-paid-orders-legacy-dashboard", organizer?.id, events?.length],
    queryFn: async () => {
      const eventIds = (events || []).map((e: any) => e.id);
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("total_cents, event_id")
        .in("event_id", eventIds)
        .eq("status", "paid");
      if (error) throw error;
      return data;
    },
    enabled: !!events && events.length > 0,
  });

  // Create organizer account
  const createOrgMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .insert({ owner_user_id: user!.id, display_name: displayName })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-account"] });
      setShowCreateOrg(false);
      toast({ title: "Conta criada!", description: "Agora você pode criar eventos." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || orgLoading) return <><Header /><PageLoading /><Footer /></>;

  if (!organizer) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container max-w-lg">
            <EmptyState
              icon={<Users className="h-8 w-8 text-accent" />}
              title="Torne-se um Organizador"
              description="Crie sua conta de organizador para começar a criar e gerenciar eventos."
              variant="default"
              action={<Button onClick={() => setShowCreateOrg(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Criar Conta de Organizador</Button>}
              className="py-20"
            />

            <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar conta de organizador</DialogTitle>
                  <DialogDescription>
                    Escolha um nome para sua conta de organizador.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Nome do Organizador</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ex: Eventos XYZ"
                    />
                  </div>
                  <Button
                    onClick={() => createOrgMutation.mutate(orgName)}
                    disabled={!orgName.trim() || createOrgMutation.isPending}
                    className="w-full"
                  >
                    {createOrgMutation.isPending ? "Criando..." : "Criar Conta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate stats
  const totalTicketsSold = issuedTickets?.length || 0;
  const totalRevenue = paidOrders?.reduce((acc: number, o: any) => acc + (o.total_cents || 0), 0) || 0;

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const statusVariant = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "published": return "Publicado";
      case "draft": return "Rascunho";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="container px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{organizer.display_name}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link to="/organizador/cupons">
                  <Tag className="h-4 w-4 mr-2" />
                  Cupons
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link to="/organizador/check-in">
                  <QrCode className="h-4 w-4 mr-2" />
                  Check-in
                </Link>
              </Button>
              <Button asChild className="flex-1 sm:flex-none">
                <Link to="/organizador/evento/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Evento
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-card rounded-xl border border-border p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{events?.length || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Eventos</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{totalTicketsSold}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Vendidos</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{formatPrice(totalRevenue)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Receita</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{events?.filter(e => e.status === "published").length || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ativos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="p-4 sm:p-6 border-b border-border">
              <h2 className="font-display text-lg sm:text-xl font-bold">Meus Eventos</h2>
            </div>

            {eventsLoading ? (
              <PageLoading />
            ) : events && events.length > 0 ? (
              <div className="divide-y divide-border">
                {events.map((event) => {
                  const ticketsSold = issuedTickets?.filter((t: any) => t.event_id === event.id).length || 0;
                  const totalTickets = event.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_total || 0), 0) || 0;

                  return (
                    <div key={event.id} className="p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Image */}
                      <div className="w-full sm:w-20 md:w-24 h-28 sm:h-14 md:h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {event.cover_image_url ? (
                          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={statusVariant(event.status || "draft") as any} className="text-xs">{statusLabel(event.status || "draft")}</Badge>
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base truncate">{event.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(event.start_at), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 text-xs sm:text-sm">
                        <div className="text-left sm:text-center">
                          <p className="font-semibold">{ticketsSold}/{totalTickets}</p>
                          <p className="text-muted-foreground">Vendidos</p>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/organizador/evento/${event.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/evento/${event.slug || event.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Página
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-accent" />}
                title="Nenhum evento ainda"
                description="Crie seu primeiro evento para começar a vender ingressos."
                variant="default"
                action={
                  <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link to="/organizador/evento/novo">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Evento
                    </Link>
                  </Button>
                }
                className="py-12"
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
