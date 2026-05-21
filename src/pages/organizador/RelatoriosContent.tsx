import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Ticket, Calendar, DollarSign, Percent, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--secondary))"];

export default function RelatoriosContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const queryClient = useQueryClient();

  // Get all events with ticket data
  const { data: events } = useQuery({
    queryKey: ["organizer-reports-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(quantity_total, quantity_sold, price_cents, name)`)
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
    refetchInterval: 15000,
  });

  const eventIds = (events || []).map((e: any) => e.id);

  // Get paid orders for this organizer's events
  const { data: orders } = useQuery({
    queryKey: ["organizer-orders", organizer?.id, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_cents, commission_cents, status, created_at, event_id")
        .in("event_id", eventIds)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: eventIds.length > 0,
    refetchInterval: 15000,
  });

  // Get issued/used tickets (real sold count)
  const { data: issuedTickets } = useQuery({
    queryKey: ["organizer-issued-tickets", organizer?.id, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("id, event_id, status")
        .in("event_id", eventIds)
        .in("status", ["issued", "used"]);
      if (error) throw error;
      return data;
    },
    enabled: eventIds.length > 0,
    refetchInterval: 15000,
  });

  // Realtime updates
  useEffect(() => {
    if (eventIds.length === 0) return;
    const channel = supabase
      .channel(`org-reports-${organizer?.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, (payload) => {
        const evId = (payload.new as any)?.event_id || (payload.old as any)?.event_id;
        if (evId && eventIds.includes(evId)) {
          queryClient.invalidateQueries({ queryKey: ["organizer-issued-tickets", organizer?.id] });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const evId = (payload.new as any)?.event_id || (payload.old as any)?.event_id;
        if (evId && eventIds.includes(evId)) {
          queryClient.invalidateQueries({ queryKey: ["organizer-orders", organizer?.id] });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizer?.id, eventIds.join(","), queryClient]);

  // Subscription info
  const { data: subscription } = useQuery({
    queryKey: ["organizer-subscription", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("organizer_id", organizer!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  // Calculate stats
  const totalEvents = events?.length || 0;
  const publishedEvents = events?.filter((e: any) => e.status === "published").length || 0;
  const totalTicketsSold = issuedTickets?.length || 0;
  const totalTicketsAvailable = events?.reduce((acc: number, e: any) =>
    acc + (e.ticket_types?.reduce((a: number, t: any) => a + (t.quantity_total || 0), 0) || 0), 0) || 0;
  const grossRevenue = orders?.reduce((acc: number, o: any) => acc + (o.total_cents || 0), 0) || 0;
  const totalCommission = orders?.reduce((acc: number, o: any) => acc + (o.commission_cents || 0), 0) || 0;
  const netRevenue = grossRevenue - totalCommission;
  const commissionPercent = organizer?.commission_percent || subscription?.subscription_plans?.commission_percent || 10;
  const planName = subscription?.subscription_plans?.name || "Free";

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  // Revenue by event for chart
  const revenueByEvent = events
    ?.map((event: any) => {
      const eventOrders = orders?.filter((o: any) => o.event_id === event.id) || [];
      const gross = eventOrders.reduce((a: number, o: any) => a + (o.total_cents || 0), 0);
      const commission = eventOrders.reduce((a: number, o: any) => a + (o.commission_cents || 0), 0);
      return {
        name: event.title.length > 20 ? event.title.slice(0, 20) + "..." : event.title,
        bruto: gross / 100,
        comissao: commission / 100,
        liquido: (gross - commission) / 100,
      };
    })
    .filter((e: any) => e.bruto > 0)
    .slice(0, 8) || [];

  // Split breakdown for pie chart
  const pieData = [
    { name: "Organizador", value: netRevenue / 100 },
    { name: "UPPLIN", value: totalCommission / 100 },
  ];

  // Top events
  const topEvents = events
    ?.map((event: any) => {
      const eventOrders = orders?.filter((o: any) => o.event_id === event.id) || [];
      const revenue = eventOrders.reduce((a: number, o: any) => a + (o.total_cents || 0), 0);
      const commission = eventOrders.reduce((a: number, o: any) => a + (o.commission_cents || 0), 0);
      const ticketsSold = issuedTickets?.filter((t: any) => t.event_id === event.id).length || 0;
      return { ...event, revenue, commission, net: revenue - commission, ticketsSold };
    })
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Dashboard financeiro e relatório de split</p>
        </div>
        <Badge variant="outline" className="self-start px-3 py-1.5 text-sm">
          Plano: <strong className="ml-1">{planName}</strong> — {commissionPercent}% comissão
        </Badge>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold truncate">{formatPrice(grossRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Bruta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold truncate">{formatPrice(totalCommission)}</p>
                <p className="text-sm text-muted-foreground">Comissão ({commissionPercent}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary truncate">{formatPrice(netRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Líquida</p>
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
                <p className="text-xl font-bold">{totalTicketsSold}</p>
                <p className="text-sm text-muted-foreground">Ingressos Vendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Event Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Receita por Evento
            </CardTitle>
            <CardDescription>Bruto vs Comissão vs Líquido</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByEvent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByEvent}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  />
                  <Bar dataKey="liquido" fill="hsl(var(--primary))" name="Líquido" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comissao" fill="hsl(var(--destructive))" name="Comissão" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">Sem dados de vendas ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Split Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Split</CardTitle>
            <CardDescription>Divisão do faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            {grossRevenue > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--destructive))" />
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-primary" />
                      Você recebe
                    </span>
                    <span className="font-semibold">{formatPrice(netRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-destructive" />
                      Comissão UPPLIN
                    </span>
                    <span className="font-semibold">{formatPrice(totalCommission)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">Sem vendas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Evento</CardTitle>
          <CardDescription>Receita bruta, comissão e líquido por evento</CardDescription>
        </CardHeader>
        <CardContent>
          {topEvents.length > 0 ? (
            <div className="space-y-4">
              {topEvents.map((event: any, index: number) => (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })} • {event.ticketsSold} ingressos
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="font-semibold text-sm">{formatPrice(event.net)}</p>
                    <p className="text-xs text-muted-foreground">
                      -{formatPrice(event.commission)} comissão
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Nenhum evento com vendas ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Resumo de Eventos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{totalEvents}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Publicados</span><span className="font-semibold">{publishedEvents}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rascunhos</span><span className="font-semibold">{events?.filter((e: any) => e.status === "draft").length || 0}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resumo de Ingressos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Vendidos</span><span className="font-semibold">{totalTicketsSold}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Disponíveis</span><span className="font-semibold">{totalTicketsAvailable - totalTicketsSold}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ticket Médio</span><span className="font-semibold">{totalTicketsSold > 0 ? formatPrice(Math.round(grossRevenue / totalTicketsSold)) : "R$ 0,00"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ocupação</span><span className="font-semibold">{totalTicketsAvailable > 0 ? Math.round((totalTicketsSold / totalTicketsAvailable) * 100) : 0}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
