import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Users, 
  FileText, 
  Webhook, 
  Search, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Admin() {
  const [searchUsers, setSearchUsers] = useState("");
  const [cpfDialog, setCpfDialog] = useState<{ open: boolean; request: any }>({ open: false, request: null });
  const queryClient = useQueryClient();

  // Fetch users with profiles
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
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch CPF change requests
  const { data: cpfRequests = [], isLoading: loadingCpf } = useQuery({
    queryKey: ["admin-cpf-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpf_change_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch webhook events
  const { data: webhookEvents = [], isLoading: loadingWebhooks } = useQuery({
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
  });

  // Handle CPF request
  const cpfMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) => {
      const request = cpfRequests.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      if (status === "approved") {
        // Update user's CPF
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ cpf: request.requested_cpf })
          .eq("id", request.user_id);
        
        if (profileError) throw profileError;
      }

      // Update request status
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      case "processed":
        return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Processado</Badge>;
      case "received":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Recebido</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Painel Admin</h1>
            <p className="text-muted-foreground">Gerencie usuários, solicitações e eventos do sistema</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Solicitações CPF</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cpfRequests.filter(r => r.status === "pending").length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">pendentes</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
                <Webhook className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {webhookEvents.filter(w => w.status === "failed").length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">com erro</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="cpf" className="gap-2">
                <FileText className="h-4 w-4" />
                Solicitações CPF
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Usuários</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                        users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {user.cpf ? (
                                <span className="font-mono text-sm">{user.cpf}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {user.user_roles?.map((r: any) => (
                                  <Badge key={r.role} variant="secondary" className="text-xs">
                                    {r.role}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CPF Requests Tab */}
            <TabsContent value="cpf">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitações de Troca de CPF</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CPF Atual</TableHead>
                        <TableHead>CPF Solicitado</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCpf ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : cpfRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma solicitação
                          </TableCell>
                        </TableRow>
                      ) : (
                        cpfRequests.map((request: any) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">{request.current_cpf || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{request.requested_cpf}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{request.reason || "-"}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {request.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCpfDialog({ open: true, request })}
                                >
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
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recebido</TableHead>
                        <TableHead>Processado</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingWebhooks ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : webhookEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum evento
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhookEvents.map((event: any) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.provider}</TableCell>
                            <TableCell>{event.event_type || "-"}</TableCell>
                            <TableCell>{getStatusBadge(event.status)}</TableCell>
                            <TableCell>
                              {event.received_at && format(new Date(event.received_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {event.processed_at && format(new Date(event.processed_at), "dd/MM HH:mm:ss", { locale: ptBR })}
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
            <DialogDescription>
              Revise os dados e aprove ou rejeite a solicitação
            </DialogDescription>
          </DialogHeader>
          {cpfDialog.request && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">CPF Atual</p>
                  <p className="font-mono">{cpfDialog.request.current_cpf || "Não definido"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF Solicitado</p>
                  <p className="font-mono font-semibold">{cpfDialog.request.requested_cpf}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Motivo</p>
                <p>{cpfDialog.request.reason || "Não informado"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => cpfMutation.mutate({ requestId: cpfDialog.request?.id, status: "rejected" })}
              disabled={cpfMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={() => cpfMutation.mutate({ requestId: cpfDialog.request?.id, status: "approved" })}
              disabled={cpfMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
