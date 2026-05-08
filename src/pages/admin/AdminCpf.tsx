import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { translateCpfError } from "@/lib/cpfErrors";

interface CpfRequest {
  id: string;
  user_id: string;
  current_cpf: string | null;
  requested_cpf: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

export default function AdminCpf() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    request: CpfRequest | null;
    action: "approve" | "reject" | null;
  }>({
    open: false,
    request: null,
    action: null,
  });
  const [rejectReason, setRejectReason] = useState("");

  // Fetch CPF requests
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-cpf-requests-full", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("cpf_change_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "approved" | "rejected");
      }

      const { data: requestsData, error } = await query;
      if (error) throw error;
      if (!requestsData || requestsData.length === 0) return [];

      // Fetch profiles for all user_ids
      const userIds = [...new Set(requestsData.map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      return requestsData.map((r) => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || null,
      })) as CpfRequest[];
    },
  });

  // Process request mutation
  const processRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      userId,
      newCpf,
    }: {
      requestId: string;
      action: "approved" | "rejected";
      userId: string;
      newCpf: string;
    }) => {
      if (action === "approved") {
        // Update profile CPF
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ cpf: newCpf })
          .eq("id", userId);
        if (profileError) throw profileError;
      }

      // Update request status
      const { error } = await supabase
        .from("cpf_change_requests")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;

      // Log the action
      await supabase.from("admin_action_logs").insert({
        admin_user_id: currentUser!.id,
        action_type: action === "approved" ? "cpf_approved" : "cpf_rejected",
        target_type: "cpf_request",
        target_id: requestId,
        reason: action === "rejected" ? rejectReason : undefined,
        metadata: { user_id: userId, new_cpf: newCpf },
      });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cpf-requests-full"] });
      toast.success(
        action === "approved" ? "CPF atualizado com sucesso" : "Solicitação rejeitada"
      );
      setActionDialog({ open: false, request: null, action: null });
      setRejectReason("");
    },
    onError: () => {
      toast.error("Erro ao processar solicitação");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCpf = (cpf: string) => {
    if (!cpf) return "-";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Alteração de CPF</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de alteração de CPF dos usuários
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
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
            <p className="text-2xl font-bold text-success">{stats.approved}</p>
            <p className="text-sm text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            <p className="text-sm text-muted-foreground">Rejeitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Solicitações</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>CPF Atual</TableHead>
                  <TableHead>CPF Solicitado</TableHead>
                  <TableHead>Motivo</TableHead>
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
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.profiles?.full_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCpf(request.current_cpf || "")}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {formatCpf(request.requested_cpf)}
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="text-sm truncate" title={request.reason || undefined}>
                          {request.reason || "-"}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm">
                        {request.created_at
                          ? format(new Date(request.created_at), "dd/MM/yy HH:mm", {
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() =>
                                setActionDialog({ open: true, request, action: "approve" })
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActionDialog({ open: true, request, action: "reject" })
                              }
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, request: null, action: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approve"
                ? "Aprovar Alteração de CPF"
                : "Rejeitar Alteração de CPF"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve"
                ? "O CPF do usuário será atualizado para o valor solicitado."
                : "A solicitação será rejeitada e o CPF permanecerá inalterado."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.request && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-medium">{actionDialog.request.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm">{actionDialog.request.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF Atual</p>
                  <p className="font-mono">{formatCpf(actionDialog.request.current_cpf || "")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF Solicitado</p>
                  <p className="font-mono font-medium">
                    {formatCpf(actionDialog.request.requested_cpf)}
                  </p>
                </div>
              </div>

              {actionDialog.request.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Motivo do usuário</p>
                  <p className="text-sm bg-muted p-2 rounded">{actionDialog.request.reason}</p>
                </div>
              )}

              {actionDialog.action === "reject" && (
                <div className="space-y-2">
                  <Label>Motivo da rejeição</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Informe o motivo da rejeição..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, request: null, action: null })}
            >
              Cancelar
            </Button>
            <Button
              variant={actionDialog.action === "reject" ? "destructive" : "default"}
              onClick={() => {
                if (actionDialog.action === "reject" && !rejectReason.trim()) {
                  toast.error("Informe o motivo da rejeição");
                  return;
                }
                processRequestMutation.mutate({
                  requestId: actionDialog.request!.id,
                  action: actionDialog.action === "approve" ? "approved" : "rejected",
                  userId: actionDialog.request!.user_id,
                  newCpf: actionDialog.request!.requested_cpf,
                });
              }}
              disabled={processRequestMutation.isPending}
            >
              {processRequestMutation.isPending
                ? "Processando..."
                : actionDialog.action === "approve"
                ? "Aprovar"
                : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
