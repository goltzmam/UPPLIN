import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, MoreVertical, Edit, Eye, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";

export default function EventosListContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get all events
  const { data: events, isLoading } = useQuery({
    queryKey: ["organizer-all-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(quantity_total, quantity_sold, price_cents)`)
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  const { data: issuedTickets } = useQuery({
    queryKey: ["organizer-issued-tickets-events-list", organizer?.id, events?.length],
    queryFn: async () => {
      const eventIds = (events || []).map((event: any) => event.id);
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("id, event_id")
        .in("event_id", eventIds)
        .in("status", ["issued", "used"]);
      if (error) throw error;
      return data;
    },
    enabled: !!events && events.length > 0,
  });

  const { data: paidOrders } = useQuery({
    queryKey: ["organizer-paid-orders-events-list", organizer?.id, events?.length],
    queryFn: async () => {
      const eventIds = (events || []).map((event: any) => event.id);
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

  const statusVariant = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      case "cancelled": return "destructive";
      case "pending_review": return "outline";
      case "paused": return "outline";
      default: return "outline";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "published": return "Publicado";
      case "draft": return "Rascunho";
      case "cancelled": return "Cancelado";
      case "pending_review": return "Aguardando Aprovação";
      case "paused": return "Pausado";
      default: return status;
    }
  };

  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Meus Eventos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os seus eventos</p>
        </div>
        <Button asChild>
          <Link to="/organizador/painel/evento/novo">
            <Plus className="h-4 w-4 mr-2" />
            Criar Evento
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="pending_review">Aguardando Aprovação</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <PageLoading />
        ) : filteredEvents.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredEvents.map((event) => {
              const ticketsSold = issuedTickets?.filter((ticket: any) => ticket.event_id === event.id).length || 0;
              const totalTickets = event.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_total || 0), 0) || 0;
              const revenue = paidOrders?.filter((order: any) => order.event_id === event.id).reduce((acc: number, order: any) => acc + (order.total_cents || 0), 0) || 0;

              return (
                <div key={event.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Image */}
                  <div className="w-full sm:w-24 h-32 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
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
                      {event.category && (
                        <Badge variant="outline" className="text-xs">
                          {event.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                    {event.venue_name && (
                      <p className="text-sm text-muted-foreground truncate">{event.venue_name}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:flex items-center gap-4 sm:gap-6 text-sm">
                    <div className="text-left sm:text-center">
                      <p className="font-semibold">{ticketsSold}/{totalTickets}</p>
                      <p className="text-muted-foreground">Ingressos</p>
                    </div>
                    <div className="text-left sm:text-center">
                      <p className="font-semibold">R$ {(revenue / 100).toFixed(2).replace(".", ",")}</p>
                      <p className="text-muted-foreground">Receita</p>
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
                          <Link to={`/organizador/painel/evento/${event.id}`}>
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
            title={search || statusFilter !== "all" ? "Nenhum evento encontrado" : "Nenhum evento ainda"}
            description={search || statusFilter !== "all" ? "Tente ajustar seus filtros" : "Crie seu primeiro evento para começar"}
            variant="default"
            action={
              !search && statusFilter === "all" && (
                <Button asChild>
                  <Link to="/organizador/painel/evento/novo">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Evento
                  </Link>
                </Button>
              )
            }
            className="py-12"
          />
        )}
      </div>
    </div>
  );
}
