import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Clock, ShieldCheck, Loader2, Tag, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { triggerFeedback } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          events(title, start_at, venue_name),
          order_items(*, ticket_types(name))
        `)
        .eq("id", orderId)
        .eq("buyer_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const calculateDiscount = () => {
    if (!appliedCoupon || !order) return 0;
    
    if (appliedCoupon.discount_type === "percentage") {
      return Math.floor(order.total_cents * (appliedCoupon.discount_value / 100));
    } else {
      return appliedCoupon.discount_value; // Already in cents
    }
  };

  const discountAmount = calculateDiscount();
  const finalTotal = order ? Math.max(0, order.total_cents - discountAmount) : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !order) return;
    
    setApplyingCoupon(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        toast({ title: "Cupom não encontrado", variant: "destructive" });
        return;
      }

      // Check if coupon is for this event or global
      if (coupon.event_id && coupon.event_id !== order.event_id) {
        toast({ title: "Cupom não válido para este evento", variant: "destructive" });
        return;
      }

      // Check validity dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast({ title: "Cupom ainda não está válido", variant: "destructive" });
        return;
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({ title: "Cupom expirado", variant: "destructive" });
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        toast({ title: "Cupom esgotado", variant: "destructive" });
        return;
      }

      // Check minimum purchase
      if (coupon.min_purchase_cents && order.total_cents < coupon.min_purchase_cents) {
        toast({ 
          title: "Valor mínimo não atingido", 
          description: `Mínimo de ${formatPrice(coupon.min_purchase_cents)}`,
          variant: "destructive" 
        });
        return;
      }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      });
      
      toast({ title: "Cupom aplicado!", description: `Desconto de ${coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatPrice(coupon.discount_value)}` });
    } catch (err: any) {
      toast({ title: "Erro ao aplicar cupom", description: err.message, variant: "destructive" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handlePayment = async () => {
    setProcessing(true);

    // In production, this would call an edge function to create a payment intent
    // For now, we simulate a successful payment
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update order status (in production this would be done via webhook)
      // For demo purposes, we'll just redirect
      toast({ title: "Pagamento simulado!", description: "Redirecionando..." });
      
      // For now, navigate back to tickets
      navigate("/meus-ingressos");
    } catch (err: any) {
      toast({ title: "Erro no pagamento", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || isLoading) return <><Header /><PageLoading /><Footer /></>;

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <EmptyState
            icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
            title="Pedido não encontrado"
            description="Este pedido não existe ou expirou."
            action={<Button onClick={() => navigate("/eventos")}>Ver Eventos</Button>}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const expiresAt = order.expires_at ? new Date(order.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />

      <main className="flex-1 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="container max-w-4xl px-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

          {isExpired ? (
            <EmptyState
              icon={<Clock className="h-8 w-8 text-muted-foreground" />}
              title="Pedido expirado"
              description="Este pedido expirou. Por favor, faça uma nova reserva."
              action={<Button onClick={() => navigate("/eventos")}>Ver Eventos</Button>}
            />
          ) : (
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Order Summary */}
              <div className="md:col-span-2 space-y-4 sm:space-y-6">
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up">
                  <h2 className="font-display text-lg sm:text-xl font-bold mb-4">{order.events?.title}</h2>

                  <div className="divide-y divide-border">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="py-3 flex justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{item.ticket_types?.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{item.qty}x {formatPrice(item.unit_price_cents)}</p>
                        </div>
                        <p className="font-semibold text-sm sm:text-base shrink-0">{formatPrice(item.unit_price_cents * item.qty)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Section */}
                  <div className="border-t border-border pt-4 mt-4 space-y-3">
                    <p className="text-sm font-medium">Cupom de desconto</p>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary">{appliedCoupon.code}</span>
                          <span className="text-sm text-muted-foreground">
                            (-{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discount_value)})
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemoveCoupon}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite o código"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          onClick={handleApplyCoupon}
                          disabled={applyingCoupon || !couponCode.trim()}
                        >
                          {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-border pt-4 mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(order.total_cents)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-primary">
                        <span>Desconto</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-display text-base sm:text-lg font-bold">Total</span>
                      <span className="font-display text-xl sm:text-2xl font-bold text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Timer */}
                {expiresAt && (
                  <div className="bg-accent/20 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">Reserva expira em breve</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Complete o pagamento para garantir seus ingressos.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-1">
                  <h2 className="font-display text-base sm:text-lg font-bold mb-4">Pagamento</h2>

                  <div className="space-y-4">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={() => {
                        triggerFeedback({ haptic: "medium", sound: "confirm" });
                        handlePayment();
                      }} 
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      )}
                      {processing ? "Processando..." : "Pagar Agora"}
                    </Button>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center">
                      <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Pagamento 100% seguro</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                  Ao continuar, você concorda com os termos de uso e política de privacidade.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
