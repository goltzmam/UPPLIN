import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Check, Loader2, Zap, Sparkles, ArrowRight, AlertTriangle, MessageCircle, Phone, Receipt, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6" />,
  enterprise: <Sparkles className="h-6 w-6" />,
};

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary/10 text-primary",
  enterprise: "bg-accent/10 text-accent",
};

export default function AssinaturasContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: currentSub, isLoading: loadingSub } = useQuery({
    queryKey: ["organizer-subscription", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("organizer_id", organizer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizer?.id,
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["subscription-invoices", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_invoices")
        .select("*")
        .eq("organizer_id", organizer.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!organizer?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      setSubscribingPlan(planId);
      const { data, error } = await supabase.functions.invoke("mp-subscribe", {
        body: { plan_id: planId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      if (data.status === "active") {
        toast({ title: "Plano ativado! ✅", description: "Seu plano foi atualizado com sucesso." });
        queryClient.invalidateQueries({ queryKey: ["organizer-subscription"] });
      } else if (data.init_point) {
        window.location.href = data.init_point;
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => setSubscribingPlan(null),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription");
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Assinatura cancelada", description: "Você foi migrado para o plano Free." });
      queryClient.invalidateQueries({ queryKey: ["organizer-subscription"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    },
  });

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const currentPlanId = currentSub?.plan_id;
  const isActive = currentSub?.status === "active";
  const hasPaidPlan = isActive && currentPlanId && currentPlanId !== "free";

  if (loadingPlans || loadingSub) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Planos & Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o plano ideal para reduzir sua comissão por venda
        </p>
      </div>

      {/* Current Plan Badge */}
      {currentSub && isActive && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${planColors[currentPlanId || "free"]}`}>
            {planIcons[currentPlanId || "free"]}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Plano atual</p>
            <p className="text-lg font-bold font-display">{currentSub.subscription_plans?.name || "Free"}</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">Ativo</Badge>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.map((plan) => {
          const isCurrent = currentPlanId === plan.id && isActive;
          const features = Array.isArray(plan.features) ? plan.features as string[] : [];

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all ${
                isCurrent ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
              }`}
            >
              {plan.id === "pro" && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              )}

              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${planColors[plan.id] || "bg-muted"}`}>
                  {planIcons[plan.id] || <Zap className="h-6 w-6" />}
                </div>
                <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground font-display">
                    {formatPrice(plan.price_cents)}
                  </span>
                  {plan.price_cents > 0 && <span className="text-muted-foreground">/mês</span>}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Comissão por venda</p>
                  <p className="text-2xl font-bold font-display text-primary">{plan.commission_percent}%</p>
                </div>

                <ul className="space-y-2">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{String(feature)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.id === "pro" ? "default" : "outline"}
                  disabled={isCurrent || subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate(plan.id)}
                >
                  {subscribingPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isCurrent ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {isCurrent ? "Plano Atual" : plan.price_cents === 0 ? "Ativar Grátis" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancellation Section */}
      {hasPaidPlan && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-lg font-bold">Cancelar assinatura</h3>
          <p className="text-sm text-muted-foreground">
            Ao cancelar, você será migrado para o plano Free com comissão de 10% por venda.
            O cancelamento é imediato.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Cancelar Assinatura
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar cancelamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sua assinatura do plano <strong>{currentSub?.subscription_plans?.name}</strong> será cancelada imediatamente.
                  Você será migrado para o plano <strong>Free</strong> com comissão de <strong>10%</strong> por venda.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter plano</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Invoice History */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">Histórico de Faturas</h3>
        </div>

        {loadingInvoices ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
                    paid: { label: "Pago", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400" },
                    pending: { label: "Pendente", icon: <Clock className="h-3.5 w-3.5" />, className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400" },
                    failed: { label: "Falhou", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-destructive bg-destructive/10" },
                    refunded: { label: "Reembolsado", icon: <ArrowRight className="h-3.5 w-3.5" />, className: "text-muted-foreground bg-muted" },
                  };
                  const st = statusConfig[inv.status] || statusConfig.pending;
                  const periodStart = new Date(inv.period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                  const periodEnd = inv.period_end ? new Date(inv.period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                          {periodStart} — {periodEnd}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {formatPrice(inv.amount_cents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 text-xs ${st.className}`}>
                          {st.icon}
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {inv.paid_at
                          ? new Date(inv.paid_at).toLocaleDateString("pt-BR")
                          : new Date(inv.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Support Section */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-2">Precisa de ajuda?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Fale com nosso suporte para tirar dúvidas sobre planos, pagamentos ou funcionalidades.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="https://wa.me/558520103399?text=Olá! Preciso de ajuda com minha assinatura UPPLIN." target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="tel:+558520103399">
              <Phone className="h-4 w-4 mr-2" />
              (85) 2010-3399
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:contato@upplin.com">
              Enviar e-mail
            </a>
          </Button>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Ao assinar, você concorda com os termos de uso. Cancelamento disponível a qualquer momento.
      </p>
    </div>
  );
}
