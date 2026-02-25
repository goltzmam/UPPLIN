import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Clock, ShieldCheck, Loader2, Tag, Check, X, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch MP public key and initialize SDK
  const { data: mpPublicKey } = useQuery({
    queryKey: ["mp-public-key", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mp-get-public-key", {
        body: null,
        method: "GET",
        headers: {},
      });
      // Workaround: invoke doesn't support query params natively, use direct fetch
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-get-public-key?order_id=${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!resp.ok) throw new Error("Failed to get public key");
      const result = await resp.json();
      return result.public_key as string;
    },
    enabled: !!orderId && !!user,
  });

  useEffect(() => {
    if (mpPublicKey && !mpInitialized) {
      initMercadoPago(mpPublicKey, { locale: "pt-BR" });
      setMpInitialized(true);
    }
  }, [mpPublicKey, mpInitialized]);

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
      return appliedCoupon.discount_value;
    }
  };

  const discountAmount = calculateDiscount();
  const finalTotal = order ? Math.max(0, order.total_cents - discountAmount) : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !order) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!coupon) { setCouponError("Cupom não encontrado"); return; }
      if (coupon.event_id && coupon.event_id !== order.event_id) { setCouponError("Cupom não válido para este evento"); return; }
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) { setCouponError("Cupom ainda não está válido"); return; }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) { setCouponError("Cupom expirado"); return; }
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) { setCouponError("Cupom esgotado"); return; }
      if (coupon.min_purchase_cents && order.total_cents < coupon.min_purchase_cents) { setCouponError(`Mínimo de ${formatPrice(coupon.min_purchase_cents)}`); return; }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      });
    } catch {
      setCouponError("Erro ao aplicar cupom");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const onCardPaymentSubmit = useCallback(async (formData: any) => {
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke("mp-process-payment", {
        body: {
          order_id: orderId,
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          issuer_id: formData.issuer_id,
          payer_email: formData.payer?.email,
          identification_type: formData.payer?.identification?.type,
          identification_number: formData.payer?.identification?.number,
        },
      });

      if (error) throw new Error(error.message);

      if (data.status === "approved") {
        setPaymentSuccess(true);
        toast({ title: "Pagamento aprovado! 🎉", description: "Seus ingressos foram emitidos." });
        setTimeout(() => navigate("/pagamento-sucesso?status=approved"), 1500);
      } else if (data.status === "rejected") {
        const detail = getStatusDetailMessage(data.status_detail);
        setPaymentError(detail);
        toast({ title: "Pagamento recusado", description: detail, variant: "destructive" });
      } else if (data.status === "in_process" || data.status === "pending") {
        toast({ title: "Pagamento pendente", description: "Seu pagamento está sendo processado. Você receberá uma confirmação em breve." });
        setTimeout(() => navigate("/meus-ingressos"), 2000);
      }
    } catch (err: any) {
      console.error("Erro no pagamento:", err.message);
      setPaymentError(err.message || "Erro ao processar pagamento");
      toast({ title: "Erro no pagamento", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [orderId, navigate, toast, processing]);

  const onCardPaymentError = useCallback((error: any) => {
    console.error("Card Payment Brick error:", error);
  }, []);

  if (authLoading || isLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
        <PageLoading />
      </main>
      <BottomNav />
    </div>
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <TikTokDesktopSidebar />
        <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0 flex items-center justify-center">
          <EmptyState
            icon={<CreditCard className="h-8 w-8 text-accent" />}
            title="Pedido não encontrado"
            description="Este pedido não existe ou expirou."
            variant="default"
            action={<Button onClick={() => navigate("/eventos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Ver Eventos</Button>}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const expiresAt = order.expires_at ? new Date(order.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <div className="min-h-screen bg-muted/30">
      <TikTokDesktopSidebar />

      <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0 py-6 sm:py-8">
        <div className="container max-w-4xl px-4">
          <Breadcrumb
            items={[
              { label: "Eventos", href: "/eventos" },
              { label: order.events?.title || "Evento", href: `/evento/${order.event_id}` },
              { label: "Checkout" }
            ]}
            className="mb-4"
          />
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

          {isExpired ? (
            <EmptyState
              icon={<Clock className="h-8 w-8 text-accent" />}
              title="Pedido expirado"
              description="Este pedido expirou. Por favor, faça uma nova reserva."
              variant="default"
              action={<Button onClick={() => navigate("/eventos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Ver Eventos</Button>}
            />
          ) : paymentSuccess ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Pagamento Aprovado!</h2>
              <p className="text-muted-foreground">Redirecionando para seus ingressos...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Order Summary */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up">
                  <h2 className="font-display text-lg font-bold mb-4">{order.events?.title}</h2>

                  <div className="divide-y divide-border">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="py-3 flex justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.ticket_types?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.qty}x {formatPrice(item.unit_price_cents)}</p>
                        </div>
                        <p className="font-semibold text-sm shrink-0">{formatPrice(item.unit_price_cents * item.qty)}</p>
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
                          <span className="font-medium text-primary text-sm">{appliedCoupon.code}</span>
                          <span className="text-xs text-muted-foreground">
                            (-{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discount_value)})
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRemoveCoupon}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite o código"
                            value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                            className="flex-1 h-9 text-sm"
                          />
                          <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}>
                            {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                          </Button>
                        </div>
                        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
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
                      <span className="font-display text-base font-bold">Total</span>
                      <span className="font-display text-xl font-bold text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Timer */}
                {expiresAt && (
                  <div className="bg-accent/20 rounded-xl p-3 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Reserva expira em breve</p>
                      <p className="text-xs text-muted-foreground">Complete o pagamento para garantir seus ingressos.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Pagamento 100% seguro</span>
                </div>
              </div>

              {/* Payment Form - CardPayment Brick */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-1">
                  <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamento
                  </h2>

                  {paymentError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl mb-4">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {mpInitialized && finalTotal > 0 ? (
                    <div id="card-payment-brick">
                      <CardPayment
                        initialization={{
                          amount: finalTotal / 100,
                        }}
                        onSubmit={onCardPaymentSubmit}
                        onError={onCardPaymentError}
                        customization={{
                          visual: {
                            style: {
                              theme: "dark" as any,
                            },
                            hideFormTitle: true,
                            hidePaymentButton: false,
                          },
                          paymentMethods: {
                            maxInstallments: 12,
                          },
                        }}
                      />
                    </div>
                  ) : finalTotal === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Seu pedido é gratuito com o cupom aplicado!</p>
                      <Button
                        onClick={() => {
                          // Handle free order
                          toast({ title: "Ingressos emitidos!", description: "Seus ingressos gratuitos foram gerados." });
                          navigate("/pagamento-sucesso?status=approved");
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Confirmar Pedido Gratuito
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando formulário de pagamento...</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                  Ao continuar, você concorda com os termos de uso e política de privacidade.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function getStatusDetailMessage(detail: string): string {
  const messages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Número do cartão incorreto.",
    cc_rejected_bad_filled_date: "Data de validade incorreta.",
    cc_rejected_bad_filled_other: "Dados do cartão incorretos.",
    cc_rejected_bad_filled_security_code: "Código de segurança incorreto.",
    cc_rejected_blacklist: "Cartão não autorizado.",
    cc_rejected_call_for_authorize: "Ligue para a operadora do cartão para autorizar.",
    cc_rejected_card_disabled: "Cartão desabilitado. Ligue para a operadora.",
    cc_rejected_duplicated_payment: "Pagamento duplicado. Aguarde alguns minutos.",
    cc_rejected_high_risk: "Pagamento recusado por segurança.",
    cc_rejected_insufficient_amount: "Saldo insuficiente.",
    cc_rejected_invalid_installments: "Parcelas inválidas para este cartão.",
    cc_rejected_max_attempts: "Limite de tentativas excedido. Tente outro cartão.",
    cc_rejected_other_reason: "Pagamento recusado. Tente outro cartão.",
  };
  return messages[detail] || "Pagamento recusado. Verifique os dados e tente novamente.";
}
