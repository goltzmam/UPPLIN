import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Crown, Users, Search, Edit, Percent, DollarSign, RefreshCw, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [editPlanDialog, setEditPlanDialog] = useState<{ open: boolean; plan: any | null }>({
    open: false, plan: null,
  });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; organizer: any | null }>({
    open: false, organizer: null,
  });
  const [assignPlanId, setAssignPlanId] = useState("free");

  // Fetch plans
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch organizers with subscriptions
  const { data: organizers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-organizers-subs", search, planFilter],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from("organizer_accounts")
        .select("id, display_name, email, commission_percent, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: subs } = await supabase
        .from("organizer_subscriptions")
        .select("*");

      const subsMap = new Map((subs || []).map((s: any) => [s.organizer_id, s]));

      let result = (orgs || []).map((o: any) => ({
        ...o,
        subscription: subsMap.get(o.id) || null,
        plan_id: subsMap.get(o.id)?.plan_id || "free",
      }));

      if (search) {
        const lower = search.toLowerCase();
        result = result.filter(
          (o: any) =>
            o.display_name?.toLowerCase().includes(lower) ||
            o.email?.toLowerCase().includes(lower)
        );
      }

      if (planFilter !== "all") {
        result = result.filter((o: any) => o.plan_id === planFilter);
      }

      return result;
    },
  });

  // Update plan pricing — cascades commission to all active organizers on this plan
  const updatePlanMutation = useMutation({
    mutationFn: async (plan: any) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          price_cents: plan.price_cents,
          commission_percent: plan.commission_percent,
        })
        .eq("id", plan.id);
      if (error) throw error;

      // Keep cached organizer_accounts.commission_percent in sync
      // (live split already reads via get_organizer_commission RPC, but we
      // align the fallback column for display + edge cases)
      const { data: subs } = await supabase
        .from("organizer_subscriptions")
        .select("organizer_id")
        .eq("plan_id", plan.id)
        .eq("status", "active");

      const orgIds = (subs || []).map((s: any) => s.organizer_id);
      if (orgIds.length > 0) {
        await supabase
          .from("organizer_accounts")
          .update({ commission_percent: plan.commission_percent } as any)
          .in("id", orgIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizers-subs"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setEditPlanDialog({ open: false, plan: null });
      toast({
        title: "Plano atualizado!",
        description: "Preço, comissão e split do Mercado Pago já refletem o novo valor para todos os organizadores deste plano.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Assign/change organizer plan
  const assignPlanMutation = useMutation({
    mutationFn: async ({ organizerId, planId }: { organizerId: string; planId: string }) => {
      // Upsert subscription
      const { error } = await supabase
        .from("organizer_subscriptions")
        .upsert({
          organizer_id: organizerId,
          plan_id: planId,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "organizer_id" });
      if (error) throw error;

      // Also update commission_percent on organizer_accounts for quick access
      const plan = plans.find((p: any) => p.id === planId);
      if (plan) {
        await supabase
          .from("organizer_accounts")
          .update({ commission_percent: plan.commission_percent } as any)
          .eq("id", organizerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizers-subs"] });
      setAssignDialog({ open: false, organizer: null });
      toast({ title: "Plano atribuído com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case "enterprise":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"><Crown className="h-3 w-3 mr-1" />Enterprise</Badge>;
      case "pro":
        return <Badge className="bg-gradient-to-r from-primary to-pink-500 text-white border-0">Pro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  // Stats
  const totalOrganizers = organizers.length;
  const proCount = organizers.filter((o: any) => o.plan_id === "pro").length;
  const enterpriseCount = organizers.filter((o: any) => o.plan_id === "enterprise").length;
  const monthlyRevenue = organizers.reduce((acc: number, o: any) => {
    const plan = plans.find((p: any) => p.id === o.plan_id);
    return acc + (plan?.price_cents || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas & Comissões</h1>
          <p className="text-muted-foreground">Gerencie planos e comissões dos organizadores</p>
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
            <Users className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{totalOrganizers}</p>
            <p className="text-sm text-muted-foreground">Organizadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Crown className="h-5 w-5 text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{proCount + enterpriseCount}</p>
            <p className="text-sm text-muted-foreground">Assinantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Percent className="h-5 w-5 text-primary mb-1" />
            <p className="text-2xl font-bold">{plans.length}</p>
            <p className="text-sm text-muted-foreground">Planos Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-success mb-1" />
            <p className="text-2xl font-bold">{formatPrice(monthlyRevenue)}</p>
            <p className="text-sm text-muted-foreground">Receita Mensal</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Planos</CardTitle>
          <CardDescription>Configure preços e comissões de cada plano</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan: any) => (
              <div
                key={plan.id}
                className="border border-border rounded-xl p-5 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  {getPlanBadge(plan.id)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditPlanDialog({ open: true, plan: { ...plan } })}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {plan.price_cents === 0 ? "Grátis" : formatPrice(plan.price_cents)}
                    {plan.price_cents > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span>Comissão: <strong>{plan.commission_percent}%</strong></span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(plan.features || []).map((f: string, i: number) => (
                    <p key={i} className="py-0.5">✓ {f}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organizers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar organizador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : organizers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum organizador</TableCell>
                  </TableRow>
                ) : (
                  organizers.map((org: any) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.display_name}</p>
                          <p className="text-xs text-muted-foreground">{org.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan_id)}</TableCell>
                      <TableCell className="font-semibold">{org.commission_percent}%</TableCell>
                      <TableCell>
                        <Badge variant={org.status === "active" ? "default" : "destructive"}>
                          {org.status === "active" ? "Ativo" : "Suspenso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignPlanId(org.plan_id);
                            setAssignDialog({ open: true, organizer: org });
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Alterar Plano
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

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanDialog.open} onOpenChange={(o) => !o && setEditPlanDialog({ open: false, plan: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano: {editPlanDialog.plan?.name}</DialogTitle>
          </DialogHeader>
          {editPlanDialog.plan && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preço mensal (centavos)</Label>
                <Input
                  type="number"
                  value={editPlanDialog.plan.price_cents}
                  onChange={(e) =>
                    setEditPlanDialog((prev) => ({
                      ...prev,
                      plan: { ...prev.plan, price_cents: parseInt(e.target.value) || 0 },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  = {formatPrice(editPlanDialog.plan.price_cents)}/mês
                </p>
              </div>
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editPlanDialog.plan.commission_percent}
                  onChange={(e) =>
                    setEditPlanDialog((prev) => ({
                      ...prev,
                      plan: { ...prev.plan, commission_percent: parseFloat(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => updatePlanMutation.mutate(editPlanDialog.plan)}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(o) => !o && setAssignDialog({ open: false, organizer: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano: {assignDialog.organizer?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.commission_percent}% comissão
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                assignPlanMutation.mutate({
                  organizerId: assignDialog.organizer?.id,
                  planId: assignPlanId,
                })
              }
              disabled={assignPlanMutation.isPending}
            >
              {assignPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atribuir Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
