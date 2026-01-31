import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2,
  Calendar,
  Ticket,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Clock,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  // Platform stats - cached aggressively
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [usersRes, organizersRes, eventsRes, ordersRes, cpfRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizer_accounts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id, status", { count: "exact" }),
        supabase.from("orders").select("total_cents, status"),
        supabase.from("cpf_change_requests").select("id, status"),
      ]);

      const paidOrders = ordersRes.data?.filter(o => o.status === "paid") || [];
      const pendingCpf = cpfRes.data?.filter(r => r.status === "pending") || [];
      const publishedEvents = eventsRes.data?.filter((e: any) => e.status === "published") || [];

      return {
        users: usersRes.count || 0,
        organizers: organizersRes.count || 0,
        events: eventsRes.data?.length || 0,
        publishedEvents: publishedEvents.length,
        ticketsSold: paidOrders.length,
        revenue: paidOrders.reduce((acc, o) => acc + (o.total_cents || 0), 0),
        pendingCpf: pendingCpf.length,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - dashboard stats don't need to be real-time
    gcTime: 1000 * 60 * 10,
  });

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const quickLinks = [
    { href: "/admin/users", label: "Gerenciar Usuários", icon: Users, description: "Editar, suspender e banir" },
    { href: "/admin/events", label: "Gerenciar Eventos", icon: Calendar, description: "Moderar e destacar" },
    { href: "/admin/orders", label: "Ver Pedidos", icon: Ticket, description: "Acompanhar vendas" },
    { href: "/admin/cpf", label: "Solicitações CPF", icon: AlertCircle, description: `${stats?.pendingCpf || 0} pendentes`, highlight: (stats?.pendingCpf || 0) > 0 },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, description: "Gráficos e métricas" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stats?.users}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stats?.organizers}</p>
                <p className="text-xs text-muted-foreground">Organizadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stats?.publishedEvents}</p>
                <p className="text-xs text-muted-foreground">Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stats?.ticketsSold}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-lg font-bold truncate">{isLoading ? "..." : formatPrice(stats?.revenue || 0)}</p>
                <p className="text-xs text-muted-foreground">Receita</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats?.pendingCpf ? "border-destructive/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className={`h-5 w-5 ${stats?.pendingCpf ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stats?.pendingCpf}</p>
                <p className="text-xs text-muted-foreground">Pendências</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <div>
        <h2 className="font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className={`hover:border-primary/50 transition-colors cursor-pointer h-full ${link.highlight ? "border-destructive/50 bg-destructive/5" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.highlight ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <link.icon className={`h-5 w-5 ${link.highlight ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
