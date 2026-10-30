import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CreditCard,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderWithDetails {
  id: string;
  buyer_user_id: string | null;
  status: string | null;
  total_cents: number;
  created_at: string | null;
  events: { title: string } | null;
  profiles: { full_name: string | null; email: string } | null;
}

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewDialog, setViewDialog] = useState<{ open: boolean; order: OrderWithDetails | null }>({
    open: false,
    order: null,
  });

  // Fetch orders
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders-full", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, events(title)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "paid" | "failed" | "cancelled" | "refunded");
      }

      const { data: ordersData, error } = await query.limit(200);
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) return [];

      // Fetch buyer profiles
      const buyerIds = [...new Set(ordersData.map((o) => o.buyer_user_id))].filter((id): id is string => !!id);
      const { data: profilesData } = buyerIds.length ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", buyerIds) : { data: [] };

      const profilesMap = new Map<string, { id: string; full_name: string | null; email: string }>((profilesData || []).map((p: { id: string; full_name: string | null; email: string }) => [p.id, p] as const));

      let result = ordersData.map((o) => ({
        ...o,
        profiles: o.buyer_user_id ? profilesMap.get(o.buyer_user_id) || null : null,
      }));

      // Filter by search (client-side for event title / buyer)
      if (search) {
        const lowerSearch = search.toLowerCase();
        result = result.filter(
          (o) =>
            o.events?.title?.toLowerCase().includes(lowerSearch) ||
            o.profiles?.full_name?.toLowerCase().includes(lowerSearch) ||
            o.profiles?.email?.toLowerCase().includes(lowerSearch) ||
            o.id.toLowerCase().includes(lowerSearch)
        );
      }

      return result as OrderWithDetails[];
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case "refunded":
        return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1" />Reembolsado</Badge>;
      default:
        return <Badge variant="secondary">{status || "pending"}</Badge>;
    }
  };

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.status === "paid").length,
    pending: orders.filter((o) => o.status === "pending").length,
    failed: orders.filter((o) => o.status === "failed" || o.status === "cancelled").length,
    revenue: orders
      .filter((o) => o.status === "paid")
      .reduce((acc, o) => acc + o.total_cents, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Pedidos</h1>
          <p className="text-muted-foreground">Visualize todos os pedidos da plataforma</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-success">{stats.paid}</p>
            <p className="text-sm text-muted-foreground">Pagos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">Falhos/Cancelados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{formatPrice(stats.revenue)}</p>
                <p className="text-sm text-muted-foreground">Receita</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por evento, comprador ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
                <SelectItem value="refunded">Reembolsados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium max-w-48 truncate">
                        {order.events?.title || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{order.profiles?.full_name || (order.buyer_user_id ? "-" : "Conta excluída")}</p>
                          <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatPrice(order.total_cents)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm">
                        {order.created_at
                          ? format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDialog({ open: true, order })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog
        open={viewDialog.open}
        onOpenChange={(open) => !open && setViewDialog({ open: false, order: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {viewDialog.order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID do Pedido</p>
                  <p className="font-mono text-sm">{viewDialog.order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewDialog.order.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Evento</p>
                  <p className="font-medium">{viewDialog.order.events?.title || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold text-lg">{formatPrice(viewDialog.order.total_cents)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comprador</p>
                  <p>{viewDialog.order.profiles?.full_name || (viewDialog.order.buyer_user_id ? "-" : "Conta excluída")}</p>
                  <p className="text-sm text-muted-foreground">{viewDialog.order.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p>
                    {viewDialog.order.created_at
                      ? format(new Date(viewDialog.order.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
