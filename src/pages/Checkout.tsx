import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Clock, ShieldCheck, Loader2, Tag, Check, X, AlertCircle, QrCode, Copy } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading, hasCompletedParticipantOnboarding } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentTab, setPaymentTab] = useState("card");
  const [cardBrickKey, setCardBrickKey] = useState(0);

  const handleTabChange = useCallback((value: string) => {
    setPaymentError(null);
    setPaymentTab(value);
    // Force remount of MP CardPayment Brick when returning to card tab
    // (the SDK keeps internal state tied to the DOM node, which breaks on tab switch)
    if (value === "card") {
      setCardBrickKey((k) => k + 1);
    }
  }, []);

  // PIX state
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: number;
    expiration?: string;
  } | null>(null);
  const [pixProcessing, setPixProcessing] = useState(false);

  // Polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Coupon state
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
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    // Bloqueia checkout até concluir o onboarding (CPF obrigatório)
    if (profile && !hasCompletedParticipantOnboarding) {
      navigate(`/onboarding?redirect=${encodeURIComponent(`/checkout/${orderId ?? ""}`)}`, { replace: true });
    }
  }, [authLoading, user, profile, hasCompletedParticipantOnboarding, navigate, orderId]);

  // Fetch MP public key
  const { data: mpPublicKey } = useQuery({
    queryKey: ["mp-public-key", orderId],
    queryFn: async () => {
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

  // Fetch order
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, events(title, start_at, venue_name, cover_image_url, checkout_banner_url), order_items(*, ticket_types(name))`)
        .eq("id", orderId)
        .eq("buyer_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Payment status polling
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = useCallback((ordId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        // Actively ask the server to check Mercado Pago status (webhook fallback)
        const { data: poll } = await supabase.functions.invoke("mp-check-payment-status", {
          body: { order_id: ordId },
        });

        const status = poll?.status;

        if (status === "paid") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPaymentSuccess(true);
          toast({ title: "Pagamento aprovado! 🎉", description: "Seus ingressos foram emitidos." });
          queryClient.invalidateQueries({ queryKey: ["order", ordId] });
          setTimeout(() => navigate("/pagamento-sucesso?status=approved"), 1500);
        } else if (status === "failed" || status === "cancelled") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPaymentError("Pagamento foi recusado ou cancelado.");
          setPixData(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 4000);
  }, [navigate, toast, queryClient]);

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  // When a coupon is applied server-side, order.total_cents already reflects the discount.
  // We derive subtotal/discount from the order itself.
  const orderSubtotal = order ? (order.subtotal_cents ?? order.total_cents + (order.discount_cents ?? 0)) : 0;
  const discountAmount = order?.discount_cents ?? 0;
  const finalTotal = order ? order.total_cents : 0;

  // Hydrate applied coupon from order on load
  useEffect(() => {
    if (order?.coupon_id && !appliedCoupon) {
      (async () => {
        const { data } = await supabase
          .from("coupons")
          .select("id, code, discount_type, discount_value")
          .eq("id", order.coupon_id)
          .maybeSingle();
        if (data) {
          setAppliedCoupon({
            id: data.id,
            code: data.code,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
          });
        }
      })();
    } else if (order && !order.coupon_id && appliedCoupon) {
      setAppliedCoupon(null);
    }
  }, [order?.coupon_id]);

  const couponErrorMessage = (code: string): string => {
    const map: Record<string, string> = {
      coupon_not_found: "Cupom não encontrado",
      coupon_wrong_event: "Cupom não válido para este evento",
      coupon_wrong_organizer: "Cupom não válido para este organizador",
      coupon_not_yet_valid: "Cupom ainda não está válido",
      coupon_expired: "Cupom expirado",
      coupon_exhausted: "Cupom esgotado",
      coupon_min_purchase: "Valor mínimo não atingido para este cupom",
      order_not_pending: "Pedido não está mais aberto",
      order_not_found: "Pedido não encontrado",
    };
    return map[code] || "Erro ao aplicar cupom";
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !order) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase.rpc("apply_coupon_to_order", {
        p_order_id: order.id,
        p_code: couponCode.toUpperCase().trim(),
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        const key = Object.keys({
          coupon_not_found: 1, coupon_wrong_event: 1, coupon_wrong_organizer: 1,
          coupon_not_yet_valid: 1, coupon_expired: 1, coupon_exhausted: 1,
          coupon_min_purchase: 1, order_not_pending: 1, order_not_found: 1,
        }).find((k) => msg.includes(k));
        setCouponError(key ? couponErrorMessage(key) : "Erro ao aplicar cupom");
        return;
      }
      const result = data as any;
      setAppliedCoupon({
        id: result.coupon_id,
        code: result.code,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      });
      // Refresh order so totals + brick reflect the new value
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      // Force MP card brick to remount with new amount
      setCardBrickKey((k) => k + 1);
      toast({ title: "Cupom aplicado!", description: `Desconto de ${formatPrice(result.discount_cents)}` });
    } catch {
      setCouponError("Erro ao aplicar cupom");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!order) return;
    try {
      await supabase.rpc("remove_coupon_from_order", { p_order_id: order.id });
    } catch {
      // ignore
    }
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    setCardBrickKey((k) => k + 1);
  };


  // Card payment handler
  const onCardPaymentSubmit = useCallback(async (formData: any) => {
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke("mp-process-payment", {
        body: {
          order_id: orderId,
          payment_type: "card",
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          issuer_id: formData.issuer_id,
          payer_email: formData.payer?.email,
          identification_type: formData.payer?.identification?.type,
          identification_number: formData.payer?.identification?.number,
        },
      });

      if (error) {
        let friendly = error.message || "Erro ao processar pagamento";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) friendly = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const text = await ctx.text();
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error) friendly = parsed.error;
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
        throw new Error(friendly);
      }

      if (data.status === "approved") {
        setPaymentSuccess(true);
        toast({ title: "Pagamento aprovado! 🎉", description: "Seus ingressos foram emitidos." });
        setTimeout(() => navigate("/pagamento-sucesso?status=approved"), 1500);
      } else if (data.status === "rejected") {
        const detail = getStatusDetailMessage(data.status_detail);
        setPaymentError(detail);
        toast({ title: "Pagamento recusado", description: detail, variant: "destructive" });
      } else if (data.status === "in_process" || data.status === "pending") {
        toast({ title: "Pagamento pendente", description: "Seu pagamento está sendo processado." });
        startPolling(orderId!);
      }
    } catch (err: any) {
      setPaymentError(err.message || "Erro ao processar pagamento");
      toast({ title: "Erro no pagamento", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [orderId, navigate, toast, processing, startPolling]);

  const onCardPaymentError = useCallback((error: any) => {
    console.error("Card Payment Brick error:", error);
  }, []);

  // PIX payment handler
  const handlePixPayment = async () => {
    if (pixProcessing || !orderId) return;
    setPixProcessing(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke("mp-process-payment", {
        body: {
          order_id: orderId,
          payment_type: "pix",
          payer_email: user?.email,
        },
      });

      // Supabase wraps non-2xx responses in FunctionsHttpError; read the JSON body to get our friendly message
      if (error) {
        let friendly = error.message || "Erro ao gerar PIX";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) friendly = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const text = await ctx.text();
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error) friendly = parsed.error;
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
        throw new Error(friendly);
      }

      if (data?.status === "approved") {
        setPaymentSuccess(true);
        toast({ title: "Pagamento aprovado! 🎉", description: "Seus ingressos foram emitidos." });
        setTimeout(() => navigate("/pagamento-sucesso?status=approved"), 1500);
      } else if (data?.pix_qr_code) {
        setPixData({
          qr_code: data.pix_qr_code,
          qr_code_base64: data.pix_qr_code_base64,
          payment_id: data.payment_id,
          expiration: data.pix_expiration,
        });
        toast({ title: "PIX gerado!", description: "Escaneie o QR Code ou copie o código para pagar." });
        startPolling(orderId);
      } else {
        setPaymentError("Erro ao gerar PIX. Tente novamente.");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Erro ao gerar PIX");
      toast({ title: "Não foi possível gerar o PIX", description: err.message, variant: "destructive" });
    } finally {
      setPixProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco para pagar." });
    }
  };

  if (authLoading || isLoading) return (
    <div className="min-h-screen bg-background">
      <TikTokDesktopSidebar />
      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe"><PageLoading /></main>
      <BottomNav />
    </div>
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <TikTokDesktopSidebar />
        <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe flex items-center justify-center">
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

      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe py-6 sm:py-8">
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

          {(order.events?.checkout_banner_url || order.events?.cover_image_url) && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-[21/9] min-h-40 bg-muted">
                <img
                  src={order.events?.checkout_banner_url || order.events?.cover_image_url || ""}
                  alt={order.events?.title ? `Banner do checkout do evento ${order.events.title}` : "Banner do checkout"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do pedido</p>
                  <p className="font-display text-xl font-bold text-foreground sm:text-2xl">{order.events?.title}</p>
                </div>
              </div>
            </div>
          )}

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

                  {/* Coupon */}
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

              {/* Payment Form */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-fade-up stagger-1">
                  <h2 className="font-display text-lg font-bold mb-4">Pagamento</h2>

                  {paymentError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl mb-4">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {finalTotal === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Seu pedido é gratuito com o cupom aplicado!</p>
                      <Button
                        onClick={() => {
                          toast({ title: "Ingressos emitidos!", description: "Seus ingressos gratuitos foram gerados." });
                          navigate("/pagamento-sucesso?status=approved");
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Confirmar Pedido Gratuito
                      </Button>
                    </div>
                  ) : (
                    <Tabs value={paymentTab} onValueChange={handleTabChange}>
                      <TabsList className="w-full mb-4">
                        <TabsTrigger value="card" className="flex-1 gap-2">
                          <CreditCard className="h-4 w-4" />
                          Cartão
                        </TabsTrigger>
                        <TabsTrigger value="pix" className="flex-1 gap-2">
                          <QrCode className="h-4 w-4" />
                          PIX
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="card" forceMount={paymentTab === "card" ? true : undefined} hidden={paymentTab !== "card"}>
                        {mpInitialized && paymentTab === "card" ? (
                          <div id="card-payment-brick" key={cardBrickKey}>
                            <CardPayment
                              key={cardBrickKey}
                              initialization={{ amount: finalTotal / 100 }}
                              onSubmit={onCardPaymentSubmit}
                              onError={onCardPaymentError}
                              customization={{
                                visual: {
                                  style: { theme: "dark" as any },
                                  hideFormTitle: true,
                                  hidePaymentButton: false,
                                },
                                paymentMethods: { maxInstallments: 12 },
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Carregando formulário...</span>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="pix">
                        {pixData ? (
                          <PixDisplay
                            pixData={pixData}
                            amount={formatPrice(finalTotal)}
                            onCopy={copyPixCode}
                          />
                        ) : (
                          <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                              <QrCode className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Pague com PIX</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Pagamento instantâneo. Aprovação em segundos.
                              </p>
                            </div>
                            <Button
                              onClick={handlePixPayment}
                              disabled={pixProcessing}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                            >
                              {pixProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Gerando PIX...
                                </>
                              ) : (
                                "Gerar QR Code PIX"
                              )}
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
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

// PIX QR Code display component
function PixDisplay({ pixData, amount, onCopy }: {
  pixData: { qr_code: string; qr_code_base64: string; expiration?: string };
  amount: string;
  onCopy: () => void;
}) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="bg-background rounded-xl p-4 inline-block mx-auto border border-border">
        {pixData.qr_code_base64 ? (
          <img
            src={`data:image/png;base64,${pixData.qr_code_base64}`}
            alt="QR Code PIX"
            className="w-48 h-48 mx-auto"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center">
            <QrCode className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
      </div>

      <div>
        <p className="font-display text-lg font-bold text-primary">{amount}</p>
        <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code com o app do seu banco</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Ou copie o código PIX:</p>
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Input
            readOnly
            value={pixData.qr_code}
            className="text-xs font-mono"
          />
          <Button variant="outline" size="icon" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Aguardando confirmação do pagamento...</span>
      </div>

      {pixData.expiration && (
        <p className="text-xs text-muted-foreground">
          Expira em: {new Date(pixData.expiration).toLocaleString("pt-BR")}
        </p>
      )}
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
