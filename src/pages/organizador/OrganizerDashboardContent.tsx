import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, Ticket, TrendingUp, BarChart3, MoreVertical, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";

export default function OrganizerDashboardContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();

  // Get events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["organizer-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(quantity_total, quantity_sold, price_cents)`)
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  // Calculate stats
  const totalTicketsSold = events?.reduce((acc, e) => 
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_sold || 0), 0) || 0), 0) || 0;
  
  const totalRevenue = events?.reduce((acc, e) => 
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + ((t.quantity_sold || 0) * (t.price_cents || 0)), 0) || 0), 0) || 0;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo, {organizer?.display_name}</p>
        </div>
        <Button asChild>
          <Link to="/organizador/evento/novo">
            <Plus className="h-4 w-4 mr-2" />
            Criar Evento
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{events?.length || 0}</p>
              <p className="text-sm text-muted-foreground truncate">Eventos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{totalTicketsSold}</p>
              <p className="text-sm text-muted-foreground truncate">Vendidos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold truncate">{formatPrice(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground truncate">Receita</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{events?.filter(e => e.status === "published").length || 0}</p>
              <p className="text-sm text-muted-foreground truncate">Ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Eventos Recentes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/organizador/eventos">Ver todos</Link>
          </Button>
        </div>

        {eventsLoading ? (
          <PageLoading />
        ) : events && events.length > 0 ? (
          <div className="divide-y divide-border">
            {events.map((event) => {
              const ticketsSold = event.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_sold || 0), 0) || 0;
              const totalTickets = event.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_total || 0), 0) || 0;

              return (
                <div key={event.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Image */}
                  <div className="w-full sm:w-20 h-28 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {event.cover_image_url ? (
                      <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant(event.status || "draft") as any} className="text-xs">
                        {statusLabel(event.status || "draft")}
                      </Badge>
                    </div>
                    <h3 className="font-semibold truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 text-sm">
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
                        <DropdownMenuItem asChild>
                          <Link to={`/organizador/evento/${event.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/evento/${event.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Página
                          </Link>
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
              <Button asChild>
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
  );
}
