import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { translateCpfError } from "@/lib/cpfErrors";
import { useAuth } from "@/lib/auth";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  photo_url: string | null;
  cpf: string | null;
  status: string | null;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string | null;
  user_roles: { role: string }[];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: UserWithRoles | null; action: "suspend" | "ban" | null }>({
    open: false,
    user: null,
    action: null,
  });
  const [suspendReason, setSuspendReason] = useState("");
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: UserWithRoles | null }>({
    open: false,
    user: null,
  });
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [viewDialog, setViewDialog] = useState<{ open: boolean; user: UserWithRoles | null }>({
    open: false,
    user: null,
  });

  // Fetch users with roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-full", search, statusFilter, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,cpf.ilike.%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: profilesData, error } = await query.limit(200);
      if (error) throw error;

      if (!profilesData || profilesData.length === 0) return [];

      // Fetch roles for all users
      const userIds = profilesData.map((p) => p.id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Map roles to users
      const rolesMap = new Map<string, { role: string }[]>();
      rolesData?.forEach((r) => {
        if (!rolesMap.has(r.user_id)) {
          rolesMap.set(r.user_id, []);
        }
        rolesMap.get(r.user_id)!.push({ role: r.role });
      });

      let result = profilesData.map((p) => ({
        ...p,
        user_roles: rolesMap.get(p.id) || [],
      }));

      // Filter by role if needed
      if (roleFilter !== "all") {
        result = result.filter((u) =>
          u.user_roles.some((r) => r.role === roleFilter)
        );
      }

      return result as UserWithRoles[];
    },
  });

  // Suspend/Ban user mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: "suspend" | "ban" | "activate"; reason?: string }) => {
      const status = action === "activate" ? "active" : action;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          status,
          suspended_reason: action === "activate" ? null : reason,
          suspended_at: action === "activate" ? null : new Date().toISOString(),
          suspended_by: action === "activate" ? null : currentUser?.id,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Log the action
      const { error: logError } = await supabase
        .from("admin_action_logs")
        .insert({
          admin_user_id: currentUser!.id,
          action_type: action === "activate" ? "user_activated" : action === "suspend" ? "user_suspended" : "user_banned",
          target_type: "user",
          target_id: userId,
          reason,
        });

      if (logError) console.error("Failed to log action:", logError);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success(
        action === "activate"
          ? "Usuário reativado com sucesso"
          : action === "suspend"
          ? "Usuário suspenso com sucesso"
          : "Usuário banido com sucesso"
      );
      setSuspendDialog({ open: false, user: null, action: null });
      setSuspendReason("");
    },
    onError: (err) => {
      const { title, description } = translateCpfError(err, "profile");
      toast.error(title, { description });
    },
  });

  // Role mutation
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: "admin" | "user" | "organizer"; action: "add" | "remove" }) => {
      if (action === "add") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }

      // Log the action
      await supabase
        .from("admin_action_logs")
        .insert({
          admin_user_id: currentUser!.id,
          action_type: action === "add" ? "role_added" : "role_removed",
          target_type: "user",
          target_id: userId,
          metadata: { role },
        });
    },
    onSuccess: (_, { action, role }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success(action === "add" ? `Role ${role} adicionada` : `Role ${role} removida`);
      setRoleDialog({ open: false, user: null });
      setSelectedRole("");
    },
    onError: () => {
      toast.error("Erro ao atualizar roles");
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case "suspended":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Suspenso</Badge>;
      case "banned":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Banido</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => !u.status || u.status === "active").length,
    suspended: users.filter(u => u.status === "suspended").length,
    banned: users.filter(u => u.status === "banned").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">Visualize, edite e modere usuários da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-success">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
            <p className="text-sm text-muted-foreground">Suspensos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">{stats.banned}</p>
            <p className="text-sm text-muted-foreground">Banidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
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
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
                <SelectItem value="banned">Banidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="organizer">Organizador</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
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
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {u.photo_url ? (
                              <img src={u.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium">{u.full_name?.[0] || u.email[0].toUpperCase()}</span>
                            )}
                          </div>
                          <span className="font-medium">{u.full_name || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="font-mono text-sm">{u.cpf || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.user_roles?.map((r) => (
                            <Badge key={r.role} variant="secondary" className="text-xs">
                              {r.role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(u.status)}</TableCell>
                      <TableCell className="text-sm">
                        {u.created_at ? format(new Date(u.created_at), "dd/MM/yy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDialog({ open: true, user: u })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleDialog({ open: true, user: u })}>
                              <Shield className="h-4 w-4 mr-2" />
                              Gerenciar roles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(!u.status || u.status === "active") ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setSuspendDialog({ open: true, user: u, action: "suspend" })}
                                  className="text-yellow-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSuspendDialog({ open: true, user: u, action: "ban" })}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Banir
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => suspendMutation.mutate({ userId: u.id, action: "activate" })}
                                className="text-success"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Suspend/Ban Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => !open && setSuspendDialog({ open: false, user: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialog.action === "suspend" ? "Suspender Usuário" : "Banir Usuário"}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.action === "suspend"
                ? "O usuário não poderá acessar a plataforma temporariamente."
                : "O usuário será permanentemente banido da plataforma."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Usuário</p>
              <p className="font-medium">{suspendDialog.user?.full_name || suspendDialog.user?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo (obrigatório)</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Descreva o motivo da ação..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null, action: null })}>
              Cancelar
            </Button>
            <Button
              variant={suspendDialog.action === "ban" ? "destructive" : "default"}
              onClick={() => {
                if (!suspendReason.trim()) {
                  toast.error("Informe o motivo");
                  return;
                }
                suspendMutation.mutate({
                  userId: suspendDialog.user!.id,
                  action: suspendDialog.action!,
                  reason: suspendReason,
                });
              }}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Processando..." : suspendDialog.action === "suspend" ? "Suspender" : "Banir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Roles</DialogTitle>
            <DialogDescription>
              Adicione ou remova roles do usuário {roleDialog.user?.full_name || roleDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Roles atuais</p>
              <div className="flex gap-2 flex-wrap">
                {roleDialog.user?.user_roles?.length ? (
                  roleDialog.user.user_roles.map((r) => (
                    <Badge key={r.role} variant="secondary" className="gap-1">
                      {r.role}
                      <button
                        onClick={() => roleMutation.mutate({ userId: roleDialog.user!.id, role: r.role as "admin" | "user" | "organizer", action: "remove" })}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma role atribuída</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adicionar role</Label>
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar role" />
                  </SelectTrigger>
                  <SelectContent>
                    {["admin", "organizer", "user"]
                      .filter((role) => !roleDialog.user?.user_roles?.some((r) => r.role === role))
                      .map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedRole) {
                      roleMutation.mutate({ userId: roleDialog.user!.id, role: selectedRole as "admin" | "user" | "organizer", action: "add" });
                    }
                  }}
                  disabled={!selectedRole || roleMutation.isPending}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ open: false, user: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {viewDialog.user && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {viewDialog.user.photo_url ? (
                    <img src={viewDialog.user.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-medium">
                      {viewDialog.user.full_name?.[0] || viewDialog.user.email[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold">{viewDialog.user.full_name || "Sem nome"}</p>
                  <p className="text-muted-foreground">{viewDialog.user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewDialog.user.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-mono">{viewDialog.user.cpf || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roles</p>
                  <div className="flex gap-1 flex-wrap">
                    {viewDialog.user.user_roles?.map((r) => (
                      <Badge key={r.role} variant="secondary" className="text-xs">
                        {r.role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cadastro</p>
                  <p>
                    {viewDialog.user.created_at
                      ? format(new Date(viewDialog.user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
              </div>

              {viewDialog.user.suspended_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Motivo da suspensão/banimento:</p>
                  <p className="text-sm mt-1">{viewDialog.user.suspended_reason}</p>
                  {viewDialog.user.suspended_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Em {format(new Date(viewDialog.user.suspended_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
