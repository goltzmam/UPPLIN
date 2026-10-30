import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function OrderCommissionDisclosure({ organizerId }: { organizerId: string }) {
  const { data, isError } = useQuery({ queryKey: ["order-commission", organizerId], queryFn: async () => {
    const { data, error } = await supabase.rpc("get_organizer_commission", { p_organizer_id: organizerId });
    if (error) throw error;return Number(data);
  } });
  return <section className="rounded-xl border p-4 space-y-2"><h2 className="font-semibold">Comissão por pedido</h2><p className="text-sm text-muted-foreground">{data !== undefined ? `${data.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% sobre o valor do pedido, calculada no pagamento.` : isError ? "Não foi possível consultar a comissão agora." : "Consultando comissão..."}</p><p className="text-xs text-muted-foreground">O pagamento do ingresso presencial é processado pelo Mercado Pago, com a comissão da plataforma e o saldo destinado ao organizador.</p></section>;
}
