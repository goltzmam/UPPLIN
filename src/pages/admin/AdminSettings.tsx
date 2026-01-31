import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Shield,
  Database,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  // Fetch admin action logs
  const { data: actionLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-action-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch webhook events
  const { data: webhookEvents = [], isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery({
    queryKey: ["admin-webhook-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Platform stats
  const { data: stats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [usersRes, organizersRes, eventsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizer_accounts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total_cents, status"),
      ]);

      const paidOrders = ordersRes.data?.filter((o) => o.status === "paid") || [];
      const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.total_cents || 0), 0);

      return {
        users: usersRes.count || 0,
        organizers: organizersRes.count || 0,
        events: eventsRes.count || 0,
        orders: ordersRes.data?.length || 0,
        revenue: totalRevenue,
      };
    },
  });

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      user_suspended: "Usuário suspenso",
      user_banned: "Usuário banido",
      user_activated: "Usuário reativado",
      role_added: "Role adicionada",
      role_removed: "Role removida",
      event_cancelled: "Evento cancelado",
      event_updated: "Evento atualizado",
      organizer_suspended: "Organizador suspenso",
      organizer_activated: "Organizador ativado",
      cpf_approved: "CPF aprovado",
      cpf_rejected: "CPF rejeitado",
    };
    return labels[actionType] || actionType;
  };

  const getWebhookStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Processado</Badge>;
      case "received":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Recebido</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Plataforma</h1>
        <p className="text-muted-foreground">Gerencie configurações e monitore a saúde do sistema</p>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.users || 0}</p>
            <p className="text-sm text-muted-foreground">Usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.organizers || 0}</p>
            <p className="text-sm text-muted-foreground">Organizadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.events || 0}</p>
            <p className="text-sm text-muted-foreground">Eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.orders || 0}</p>
            <p className="text-sm text-muted-foreground">Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-lg font-bold text-success">{formatPrice(stats?.revenue || 0)}</p>
            <p className="text-sm text-muted-foreground">Receita Total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Admin Action Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Registro de Ações Admin
                </CardTitle>
                <CardDescription>Últimas ações realizadas por administradores</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : actionLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhuma ação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    actionLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{getActionLabel(log.action_type)}</p>
                          {log.reason && (
                            <p className="text-xs text-muted-foreground truncate max-w-32">
                              {log.reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {log.target_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Eventos de Webhook
                </CardTitle>
                <CardDescription>Webhooks recebidos de provedores externos</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchWebhooks()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooksLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : webhookEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum webhook registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookEvents.map((webhook: any) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <Badge variant="outline">{webhook.provider}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{webhook.event_type || "-"}</TableCell>
                        <TableCell>{getWebhookStatusBadge(webhook.status)}</TableCell>
                        <TableCell className="text-xs">
                          {webhook.received_at
                            ? format(new Date(webhook.received_at), "dd/MM HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Saúde do Sistema
          </CardTitle>
          <CardDescription>Status geral da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Banco de Dados</span>
              </div>
              <Badge className="bg-success text-success-foreground">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Autenticação</span>
              </div>
              <Badge className="bg-success text-success-foreground">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Storage</span>
              </div>
              <Badge className="bg-success text-success-foreground">Online</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
