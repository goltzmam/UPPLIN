import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval, subMonths, startOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "12m">("30d");

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { start: subDays(now, 7), end: now, granularity: "day" };
      case "30d":
        return { start: subDays(now, 30), end: now, granularity: "day" };
      case "90d":
        return { start: subDays(now, 90), end: now, granularity: "day" };
      case "12m":
        return { start: subMonths(now, 12), end: now, granularity: "month" };
    }
  };

  const dateRange = getDateRange();

  // Fetch user growth data
  const { data: userGrowth = [], refetch: refetchUsers } = useQuery({
    queryKey: ["admin-analytics-users", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at");

      if (error) throw error;

      // Group by day or month
      const grouped: Record<string, number> = {};
      
      if (dateRange.granularity === "day") {
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        days.forEach((day) => {
          grouped[format(day, "yyyy-MM-dd")] = 0;
        });
      } else {
        const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        months.forEach((month) => {
          grouped[format(month, "yyyy-MM")] = 0;
        });
      }

      data?.forEach((item) => {
        const key = dateRange.granularity === "day"
          ? format(new Date(item.created_at!), "yyyy-MM-dd")
          : format(new Date(item.created_at!), "yyyy-MM");
        if (grouped[key] !== undefined) {
          grouped[key]++;
        }
      });

      return Object.entries(grouped).map(([date, count]) => ({
        date: dateRange.granularity === "day"
          ? format(new Date(date), "dd/MM", { locale: ptBR })
          : format(new Date(date + "-01"), "MMM/yy", { locale: ptBR }),
        users: count,
      }));
    },
  });

  // Fetch event creation data
  const { data: eventGrowth = [], refetch: refetchEvents } = useQuery({
    queryKey: ["admin-analytics-events", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("created_at, status")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at");

      if (error) throw error;

      const grouped: Record<string, { total: number; published: number }> = {};
      
      if (dateRange.granularity === "day") {
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        days.forEach((day) => {
          grouped[format(day, "yyyy-MM-dd")] = { total: 0, published: 0 };
        });
      } else {
        const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        months.forEach((month) => {
          grouped[format(month, "yyyy-MM")] = { total: 0, published: 0 };
        });
      }

      data?.forEach((item) => {
        const key = dateRange.granularity === "day"
          ? format(new Date(item.created_at!), "yyyy-MM-dd")
          : format(new Date(item.created_at!), "yyyy-MM");
        if (grouped[key]) {
          grouped[key].total++;
          if (item.status === "published") {
            grouped[key].published++;
          }
        }
      });

      return Object.entries(grouped).map(([date, counts]) => ({
        date: dateRange.granularity === "day"
          ? format(new Date(date), "dd/MM", { locale: ptBR })
          : format(new Date(date + "-01"), "MMM/yy", { locale: ptBR }),
        total: counts.total,
        published: counts.published,
      }));
    },
  });

  // Fetch revenue data
  const { data: revenueData = [], refetch: refetchRevenue } = useQuery({
    queryKey: ["admin-analytics-revenue", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total_cents, status")
        .eq("status", "paid")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at");

      if (error) throw error;

      const grouped: Record<string, number> = {};
      
      if (dateRange.granularity === "day") {
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        days.forEach((day) => {
          grouped[format(day, "yyyy-MM-dd")] = 0;
        });
      } else {
        const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        months.forEach((month) => {
          grouped[format(month, "yyyy-MM")] = 0;
        });
      }

      data?.forEach((item) => {
        const key = dateRange.granularity === "day"
          ? format(new Date(item.created_at!), "yyyy-MM-dd")
          : format(new Date(item.created_at!), "yyyy-MM");
        if (grouped[key] !== undefined) {
          grouped[key] += item.total_cents / 100;
        }
      });

      return Object.entries(grouped).map(([date, revenue]) => ({
        date: dateRange.granularity === "day"
          ? format(new Date(date), "dd/MM", { locale: ptBR })
          : format(new Date(date + "-01"), "MMM/yy", { locale: ptBR }),
        revenue: revenue,
      }));
    },
  });

  // Fetch category distribution
  const { data: categoryData = [] } = useQuery({
    queryKey: ["admin-analytics-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("category")
        .eq("status", "published")
        .not("category", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        if (item.category) {
          counts[item.category] = (counts[item.category] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });

  // Summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ["admin-analytics-summary", period],
    queryFn: async () => {
      const [usersRes, eventsRes, ordersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", dateRange.start.toISOString()),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", dateRange.start.toISOString()),
        supabase
          .from("orders")
          .select("total_cents")
          .eq("status", "paid")
          .gte("created_at", dateRange.start.toISOString()),
      ]);

      const totalRevenue = ordersRes.data?.reduce((acc, o) => acc + o.total_cents, 0) || 0;

      return {
        newUsers: usersRes.count || 0,
        newEvents: eventsRes.count || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalRevenue,
      };
    },
  });

  const handleRefresh = () => {
    refetchUsers();
    refetchEvents();
    refetchRevenue();
  };

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics da Plataforma</h1>
          <p className="text-muted-foreground">
            Acompanhe o crescimento e desempenho da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summaryStats?.newUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Novos usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summaryStats?.newEvents || 0}</p>
                <p className="text-sm text-muted-foreground">Novos eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{summaryStats?.totalOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Pedidos pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-lg font-bold">
                  {formatPrice((summaryStats?.totalRevenue || 0) / 100)}
                </p>
                <p className="text-sm text-muted-foreground">Receita</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
            <CardDescription>Novos cadastros por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita</CardTitle>
            <CardDescription>Faturamento por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatPrice(value), "Receita"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Events Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Criados</CardTitle>
            <CardDescription>Total vs Publicados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="published" name="Publicados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>Top 5 categorias de eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
