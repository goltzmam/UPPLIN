import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Check, Loader2, Zap, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Fetch available plans
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

  // Fetch current subscription
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
        // Free plan activated directly
        toast({ title: "Plano ativado! ✅", description: "Seu plano foi atualizado com sucesso." });
        queryClient.invalidateQueries({ queryKey: ["organizer-subscription"] });
      } else if (data.init_point) {
        // Redirect to MP for payment
        window.location.href = data.init_point;
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      setSubscribingPlan(null);
    },
  });

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const currentPlanId = currentSub?.plan_id;
  const isActive = currentSub?.status === "active";

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
          <div>
            <p className="font-medium text-sm">Plano atual</p>
            <p className="text-lg font-bold font-display">{currentSub.subscription_plans?.name || "Free"}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-primary border-primary">
            Ativo
          </Badge>
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
                isCurrent
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/40"
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
                  {plan.price_cents > 0 && (
                    <span className="text-muted-foreground">/mês</span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Commission rate */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Comissão por venda</p>
                  <p className="text-2xl font-bold font-display text-primary">
                    {plan.commission_percent}%
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{String(feature)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
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

      <p className="text-xs text-center text-muted-foreground">
        Ao assinar, você concorda com os termos de uso. Cancelamento disponível a qualquer momento.
      </p>
    </div>
  );
}
