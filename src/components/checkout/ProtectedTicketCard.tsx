import { Link } from "react-router-dom";
import { ShieldCheck, Check, ArrowUpRight } from "lucide-react";
export function ProtectedTicketCard() {
  return <section aria-labelledby="protected-ticket-title" className="overflow-hidden rounded-2xl border border-primary/25 bg-card">
    <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-4 sm:px-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></span><div className="min-w-0"><h2 id="protected-ticket-title" className="font-display text-lg font-bold">Seu ingresso, com segurança UPPLIN</h2><p className="text-xs text-muted-foreground">Recursos da plataforma · sem cobrança adicional</p></div></div>
    <div className="space-y-4 p-4 sm:p-5"><p className="text-sm leading-relaxed text-muted-foreground">Da compra à entrada no evento, acompanhe seu pedido e conte com os canais de atendimento da UPPLIN.</p>
      <ul className="space-y-3 text-sm">{['Pagamento processado pelo Mercado Pago, quando aplicável.','Ingresso disponível em Meus ingressos após a confirmação do pedido.','QR Code individual para validação na entrada do evento.','Solicitação de reembolso pelo app, conforme as regras aplicáveis à compra.','Contato com o organizador e com o suporte UPPLIN.'].map(text=><li key={text} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{text}</span></li>)}</ul>
      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">Este card apresenta recursos da plataforma. Não é seguro nem cobertura adicional para imprevistos pessoais. O reembolso depende das condições da compra e dos direitos previstos em lei.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2"><Link to="/termos/participante" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4">Conferir condições<ArrowUpRight className="h-3 w-3" /></Link><Link to="/suporte" className="text-sm text-primary underline underline-offset-4">Falar com o suporte</Link></div>
    </div>
  </section>;
}
