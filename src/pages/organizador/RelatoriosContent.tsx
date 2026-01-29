import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Ticket, Calendar, DollarSign } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function RelatoriosContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();

  // Get all events with ticket data
  const { data: events } = useQuery({
    queryKey: ["organizer-reports-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          ticket_types(quantity_total, quantity_sold, price_cents)
        `)
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  // Calculate stats
  const totalEvents = events?.length || 0;
  const publishedEvents = events?.filter(e => e.status === "published").length || 0;
  
  const totalTicketsSold = events?.reduce((acc, e) => 
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_sold || 0), 0) || 0), 0) || 0;
  
  const totalTicketsAvailable = events?.reduce((acc, e) => 
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_total || 0), 0) || 0), 0) || 0;
  
  const totalRevenue = events?.reduce((acc, e) => 
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + ((t.quantity_sold || 0) * (t.price_cents || 0)), 0) || 0), 0) || 0;

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  // Top events by revenue
  const topEvents = events
    ?.map(event => ({
      ...event,
      revenue: event.ticket_types?.reduce((a: number, t: any) => a + ((t.quantity_sold || 0) * (t.price_cents || 0)), 0) || 0,
      ticketsSold: event.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_sold || 0), 0) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão geral do desempenho dos seus eventos</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Ticket className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTicketsSold}</p>
                <p className="text-sm text-muted-foreground">Ingressos Vendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold truncate">{formatPrice(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalTicketsAvailable > 0 
                    ? Math.round((totalTicketsSold / totalTicketsAvailable) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Eventos por Receita
          </CardTitle>
          <CardDescription>Seus eventos com maior faturamento</CardDescription>
        </CardHeader>
        <CardContent>
          {topEvents.length > 0 ? (
            <div className="space-y-4">
              {topEvents.map((event, index) => (
                <div key={event.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatPrice(event.revenue)}</p>
                    <p className="text-sm text-muted-foreground">{event.ticketsSold} vendidos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum evento com vendas ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Publicados</span>
                <span className="font-semibold">{publishedEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rascunhos</span>
                <span className="font-semibold">{events?.filter(e => e.status === "draft").length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelados</span>
                <span className="font-semibold">{events?.filter(e => e.status === "cancelled").length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Ingressos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Vendidos</span>
                <span className="font-semibold">{totalTicketsSold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disponíveis</span>
                <span className="font-semibold">{totalTicketsAvailable - totalTicketsSold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Médio</span>
                <span className="font-semibold">
                  {totalTicketsSold > 0 
                    ? formatPrice(Math.round(totalRevenue / totalTicketsSold))
                    : "R$ 0,00"
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
