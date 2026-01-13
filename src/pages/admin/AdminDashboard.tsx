import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { 
  Users, 
  Building2,
  Calendar,
  Ticket,
  CreditCard,
  Webhook, 
  Search, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { PageLoading } from "@/components/ui/loading";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchUsers, setSearchUsers] = useState("");
  const [searchOrganizers, setSearchOrganizers] = useState("");
  const [cpfDialog, setCpfDialog] = useState<{ open: boolean; request: any }>({ open: false, request: null });

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/");
        toast.error("Acesso negado. Área restrita para administradores.");
      }
    }
  }, [authLoading, rolesLoading, user, isAdmin, navigate]);

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users", searchUsers],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      
      if (searchUsers) {
        query = query.or(`email.ilike.%${searchUsers}%,full_name.ilike.%${searchUsers}%`);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch all organizers
  const { data: organizers = [], isLoading: loadingOrganizers } = useQuery({
    queryKey: ["admin-organizers", searchOrganizers],
    queryFn: async () => {
      let query = supabase
        .from("organizer_accounts")
        .select("*, profiles:owner_user_id(full_name, email)")
        .order("created_at", { ascending: false });
      
      if (searchOrganizers) {
        query = query.ilike("display_name", `%${searchOrganizers}%`);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch all events
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, organizer_accounts(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, events(title), profiles:buyer_user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch CPF requests
  const { data: cpfRequests = [] } = useQuery({
    queryKey: ["admin-cpf-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpf_change_requests")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch webhooks
  const { data: webhookEvents = [] } = useQuery({
    queryKey: ["admin-webhook-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Handle CPF request
  const cpfMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) => {
      const request = cpfRequests.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ cpf: request.requested_cpf })
          .eq("id", request.user_id);
        if (profileError) throw profileError;
      }

      const { error } = await supabase
        .from("cpf_change_requests")
        .update({ status })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cpf-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(status === "approved" ? "CPF atualizado com sucesso" : "Solicitação rejeitada");
      setCpfDialog({ open: false, request: null });
    },
    onError: () => {
      toast.error("Erro ao processar solicitação");
    },
  });

  // Update organizer status
  const updateOrganizerMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "suspended" }) => {
      const { error } = await supabase
        .from("organizer_accounts")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizers"] });
      toast.success("Status atualizado");
    },
  });

  if (authLoading || rolesLoading) return <><Header /><PageLoading /><Footer /></>;
  if (!isAdmin) return null;

  // Calculate stats
  const totalRevenue = orders
    .filter(o => o.status === "paid")
    .reduce((acc, o) => acc + (o.total_cents || 0), 0);
  
  const totalTicketsSold = orders.filter(o => o.status === "paid").length;
  const pendingCpf = cpfRequests.filter(r => r.status === "pending").length;
  const failedWebhooks = webhookEvents.filter(w => w.status === "failed").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "approved":
      case "paid":
      case "published":
      case "active":
      case "processed":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />
          {status === "approved" ? "Aprovado" : status === "paid" ? "Pago" : status === "published" ? "Publicado" : status === "active" ? "Ativo" : "Processado"}
        </Badge>;
      case "rejected":
      case "failed":
      case "cancelled":
      case "suspended":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />
          {status === "rejected" ? "Rejeitado" : status === "failed" ? "Falhou" : status === "cancelled" ? "Cancelado" : "Suspenso"}
        </Badge>;
      case "draft":
        return <Badge variant="secondary">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold">Painel Administrativo</h1>
                  <p className="text-sm text-muted-foreground">Gerencie toda a plataforma</p>
                </div>
              </div>
              <Button asChild>
                <Link to="/admin/chats">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Central de Mensagens
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{users.length}</p>
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
                    <p className="text-2xl font-bold">{organizers.length}</p>
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
                    <p className="text-2xl font-bold">{events.length}</p>
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
                    <p className="text-2xl font-bold">{totalTicketsSold}</p>
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
                    <p className="text-lg font-bold truncate">{formatPrice(totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Receita</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">{pendingCpf + failedWebhooks}</p>
                    <p className="text-xs text-muted-foreground">Pendências</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="users" className="gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="organizers" className="gap-2 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Organizadores</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Eventos</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Pedidos</span>
              </TabsTrigger>
              <TabsTrigger value="cpf" className="gap-2 text-xs sm:text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">CPF</span>
                {pendingCpf > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs justify-center">
                    {pendingCpf}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-2 text-xs sm:text-sm">
                <Webhook className="h-4 w-4" />
                <span className="hidden sm:inline">Webhooks</span>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle>Usuários</CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name || "-"}</TableCell>
                            <TableCell className="text-sm">{u.email}</TableCell>
                            <TableCell className="font-mono text-sm">{u.cpf || "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {u.user_roles?.map((r: any) => (
                                  <Badge key={r.role} variant="secondary" className="text-xs">
                                    {r.role}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(u.created_at), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizers Tab */}
            <TabsContent value="organizers">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle>Organizadores</CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchOrganizers}
                        onChange={(e) => setSearchOrganizers(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Proprietário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingOrganizers ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : organizers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum organizador encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizers.map((org: any) => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.display_name}</TableCell>
                            <TableCell>{org.profiles?.full_name || "-"}</TableCell>
                            <TableCell className="text-sm">{org.profiles?.email}</TableCell>
                            <TableCell>{getStatusBadge(org.status)}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(org.created_at), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={org.status}
                                onValueChange={(value) => 
                                  updateOrganizerMutation.mutate({ id: org.id, status: value as any })
                                }
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Ativo</SelectItem>
                                  <SelectItem value="suspended">Suspenso</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>Eventos</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Organizador</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEvents ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : events.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhum evento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event: any) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.title}</TableCell>
                            <TableCell>{event.organizer_accounts?.display_name}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(event.start_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getStatusBadge(event.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingOrders ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum pedido encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                            <TableCell>{order.profiles?.full_name || order.profiles?.email}</TableCell>
                            <TableCell>{order.events?.title}</TableCell>
                            <TableCell className="font-medium">{formatPrice(order.total_cents)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CPF Tab */}
            <TabsContent value="cpf">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitações de Troca de CPF</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>CPF Atual</TableHead>
                        <TableHead>CPF Novo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cpfRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma solicitação
                          </TableCell>
                        </TableRow>
                      ) : (
                        cpfRequests.map((request: any) => (
                          <TableRow key={request.id}>
                            <TableCell>{request.profiles?.full_name || request.profiles?.email}</TableCell>
                            <TableCell className="font-mono text-sm">{request.current_cpf || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{request.requested_cpf}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{request.reason || "-"}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(request.created_at), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {request.status === "pending" && (
                                <Button size="sm" variant="outline" onClick={() => setCpfDialog({ open: true, request })}>
                                  Analisar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Webhooks Tab */}
            <TabsContent value="webhooks">
              <Card>
                <CardHeader>
                  <CardTitle>Eventos de Webhook</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recebido</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum evento
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhookEvents.map((event: any) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.provider}</TableCell>
                            <TableCell>{event.event_type || "-"}</TableCell>
                            <TableCell>{getStatusBadge(event.status)}</TableCell>
                            <TableCell className="text-sm">
                              {event.received_at && format(new Date(event.received_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-destructive">
                              {event.error || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* CPF Review Dialog */}
      <Dialog open={cpfDialog.open} onOpenChange={(open) => setCpfDialog({ open, request: cpfDialog.request })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analisar Solicitação de CPF</DialogTitle>
            <DialogDescription>Revise os dados e aprove ou rejeite a solicitação</DialogDescription>
          </DialogHeader>
          {cpfDialog.request && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">CPF Atual</Label>
                  <p className="font-mono">{cpfDialog.request.current_cpf || "Não definido"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CPF Solicitado</Label>
                  <p className="font-mono font-bold">{cpfDialog.request.requested_cpf}</p>
                </div>
              </div>
              {cpfDialog.request.reason && (
                <div>
                  <Label className="text-muted-foreground">Motivo</Label>
                  <p className="text-sm">{cpfDialog.request.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCpfDialog({ open: false, request: null })}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => cpfMutation.mutate({ requestId: cpfDialog.request?.id, status: "rejected" })}
              disabled={cpfMutation.isPending}
            >
              Rejeitar
            </Button>
            <Button 
              onClick={() => cpfMutation.mutate({ requestId: cpfDialog.request?.id, status: "approved" })}
              disabled={cpfMutation.isPending}
            >
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
