import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, Copy, Clock, Loader2, AlertCircle, Check, CreditCard, ArrowLeft } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PagamentoPendente() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Fetch order with payment info
  const { data: order, isLoading } = useQuery({
    queryKey: ["pending-order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, events(title, start_at, venue_name, cover_image_url), order_items(*, ticket_types(name)), payments(*)`)
        .eq("id", orderId!)
        .eq("buyer_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Fetch PIX data from payment raw field
  const pixPayment = order?.payments?.find(
    (p: any) => p.method === "pix" && (p.raw as any)?.point_of_interaction?.transaction_data
  );
  const rawData = pixPayment?.raw as any;
  const pixQrCode = rawData?.point_of_interaction?.transaction_data?.qr_code as string | undefined;
  const pixQrCodeBase64 = rawData?.point_of_interaction?.transaction_data?.qr_code_base64 as string | undefined;
  const pixExpiration = rawData?.date_of_expiration as string | undefined;

  // Poll for status changes
  const startPolling = useCallback(() => {
    if (pollingRef.current || !orderId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const { data: checked } = await supabase.functions.invoke("mp-check-payment-status", {
          body: { order_id: orderId },
        });

        const { data } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .maybeSingle();

        const status = checked?.status || data?.status;

        if (status === "paid") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPaymentApproved(true);
          toast({ title: "Pagamento aprovado! 🎉", description: "Seus ingressos foram emitidos." });
          queryClient.invalidateQueries({ queryKey: ["pending-order", orderId] });
          setTimeout(() => navigate("/pagamento-sucesso?status=approved"), 2000);
        } else if (status === "failed" || status === "cancelled") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          queryClient.invalidateQueries({ queryKey: ["pending-order", orderId] });
        }
      } catch { /* ignore */ }
    }, 5000);
  }, [orderId, navigate, toast, queryClient]);

  useEffect(() => {
    if (order?.status === "pending") startPolling();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [order?.status, startPolling]);

  const copyPixCode = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco para pagar." });
    }
  };

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

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
            description="Este pedido não existe ou você não tem acesso."
            variant="default"
            action={<Button onClick={() => navigate("/meus-ingressos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Meus Ingressos</Button>}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const isPaid = order.status === "paid" || paymentApproved;
  const isFailed = order.status === "failed" || order.status === "cancelled";
  const isPending = order.status === "pending";

  return (
    <div className="min-h-screen bg-muted/30">
      <TikTokDesktopSidebar />

      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe py-6 sm:py-8 pt-[calc(var(--safe-top)_+_1.5rem)] sm:pt-[calc(var(--safe-top)_+_2rem)]">
        <div className="container max-w-2xl px-4">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6">Detalhes do Pagamento</h1>

          {/* Event info */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 mb-6">
            <div className="flex gap-4">
              {order.events?.cover_image_url && (
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                  <img src={order.events.cover_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-bold truncate">{order.events?.title}</h2>
                {order.events?.start_at && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.events.start_at), "d 'de' MMMM, HH:mm", { locale: ptBR })}
                  </p>
                )}
                {order.events?.venue_name && (
                  <p className="text-sm text-muted-foreground">{order.events.venue_name}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-border mt-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="py-2 flex justify-between text-sm">
                  <span>{item.qty}x {item.ticket_types?.name}</span>
                  <span className="font-medium">{formatPrice(item.unit_price_cents * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
              <span className="font-display font-bold">Total</span>
              <span className="font-display text-xl font-bold text-primary">{formatPrice(order.total_cents)}</span>
            </div>
          </div>

          {/* Status */}
          {isPaid && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Pagamento Aprovado!</h2>
              <p className="text-muted-foreground mb-4">Seus ingressos foram emitidos.</p>
              <Button onClick={() => navigate("/meus-ingressos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Ver Meus Ingressos
              </Button>
            </div>
          )}

          {isFailed && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Pagamento não aprovado</h2>
              <p className="text-muted-foreground mb-4">Seu pagamento foi recusado ou cancelado. Tente novamente.</p>
              <Button onClick={() => navigate(`/evento/${order.event_id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Voltar ao Evento
              </Button>
            </div>
          )}

          {isPending && (
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-6">
              {/* Status badge */}
              <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                <Clock className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="font-medium text-sm">Aguardando pagamento</p>
                  <p className="text-xs text-muted-foreground">O pagamento ainda não foi confirmado.</p>
                </div>
              </div>

              {/* PIX QR Code */}
              {pixQrCode ? (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-lg font-bold">QR Code PIX</h3>

                  <div className="bg-background rounded-xl p-4 inline-block mx-auto border border-border">
                    {pixQrCodeBase64 ? (
                      <img
                        src={`data:image/png;base64,${pixQrCodeBase64}`}
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
                    <p className="font-display text-lg font-bold text-primary">{formatPrice(order.total_cents)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code com o app do seu banco</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Ou copie o código PIX:</p>
                    <div className="flex items-center gap-2 max-w-md mx-auto">
                      <Input readOnly value={pixQrCode} className="text-xs font-mono" />
                      <Button variant="outline" size="icon" onClick={copyPixCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Aguardando confirmação do pagamento...</span>
                  </div>

                  {pixExpiration && (
                    <p className="text-xs text-muted-foreground">
                      Expira em: {new Date(pixExpiration).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-muted-foreground text-sm">
                    O QR Code PIX não está mais disponível. Se o pagamento já foi realizado, aguarde a confirmação.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Verificando status do pagamento...</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate(`/evento/${order.event_id}`)} className="flex-1">
                  Voltar ao Evento
                </Button>
                <Button onClick={() => navigate("/meus-ingressos")} className="flex-1">
                  Meus Ingressos
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
