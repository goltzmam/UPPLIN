import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const plansData: Record<string, {
  name: string;
  commission: string;
  monthlyFee: string;
  color: string;
  features: string[];
  terms: string[];
}> = {
  standart: {
    name: "Standart",
    commission: "10%",
    monthlyFee: "Gratuito",
    color: "from-muted to-muted/60",
    features: [
      "Eventos ilimitados",
      "Check-in por QR Code",
      "Relatórios básicos",
      "Chat com participantes",
      "Suporte por e-mail",
    ],
    terms: [
      "A comissão de 10% é aplicada sobre o valor de cada ingresso vendido.",
      "A tarifa vigente no momento da criação do evento será mantida durante toda a vida útil daquele evento, mesmo que o organizador altere seu plano posteriormente.",
      "O repasse dos valores ocorre conforme as políticas do Mercado Pago, descontada a comissão da UPPLIN.",
      "Não há taxa mensal de assinatura para o plano Standart.",
      "O organizador pode migrar para outro plano a qualquer momento, sem multas. Porém, a nova tarifa só será aplicada a eventos criados após a mudança.",
      "A UPPLIN reserva-se o direito de alterar as condições comerciais mediante aviso prévio de 30 dias.",
      "Eventos com vendas de ingressos vigentes mantêm a tarifa original do plano ativo no momento da criação do evento.",
    ],
  },
  pro: {
    name: "Pro",
    commission: "8,49%",
    monthlyFee: "R$ 49,90/mês",
    color: "from-primary to-primary/60",
    features: [
      "Tudo do Standart",
      "Cupons de desconto",
      "Relatórios avançados",
      "Gestão de equipe",
      "Suporte prioritário",
      "Destaque nos resultados",
    ],
    terms: [
      "A comissão de 8,49% é aplicada sobre o valor de cada ingresso vendido.",
      "A tarifa vigente no momento da criação do evento será mantida durante toda a vida útil daquele evento, mesmo que o organizador altere seu plano posteriormente.",
      "O repasse dos valores ocorre conforme as políticas do Mercado Pago, descontada a comissão da UPPLIN.",
      "O plano Pro possui uma taxa mensal de R$ 49,90, cobrada via Mercado Pago.",
      "O organizador pode cancelar ou trocar de plano a qualquer momento, sem multas. Porém, a nova tarifa só será aplicada a eventos criados após a mudança.",
      "A UPPLIN reserva-se o direito de alterar as condições comerciais mediante aviso prévio de 30 dias.",
      "Eventos com vendas de ingressos vigentes mantêm a tarifa original do plano ativo no momento da criação do evento.",
    ],
  },
  enterprise: {
    name: "Enterprise",
    commission: "6,99%",
    monthlyFee: "R$ 149,90/mês",
    color: "from-accent to-accent/60",
    features: [
      "Tudo do Pro",
      "Menor comissão da plataforma",
      "Gerente de conta dedicado",
      "API de integração",
      "SLA de suporte 24h",
      "Personalização de marca",
    ],
    terms: [
      "A comissão de 6,99% é aplicada sobre o valor de cada ingresso vendido.",
      "A tarifa vigente no momento da criação do evento será mantida durante toda a vida útil daquele evento, mesmo que o organizador altere seu plano posteriormente.",
      "O repasse dos valores ocorre conforme as políticas do Mercado Pago, descontada a comissão da UPPLIN.",
      "O plano Enterprise possui uma taxa mensal de R$ 149,90, cobrada via Mercado Pago.",
      "O organizador pode cancelar ou trocar de plano a qualquer momento, sem multas. Porém, a nova tarifa só será aplicada a eventos criados após a mudança.",
      "A UPPLIN reserva-se o direito de alterar as condições comerciais mediante aviso prévio de 30 dias.",
      "Eventos com vendas de ingressos vigentes mantêm a tarifa original do plano ativo no momento da criação do evento.",
    ],
  },
};

export default function PoliticaPlano() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const plan = slug ? plansData[slug] : null;

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Plano não encontrado</h1>
          <Button onClick={() => navigate("/planos/organizador")}>Ver planos disponíveis</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`bg-gradient-to-br ${plan.color} py-16 px-4`}>
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" className="mb-6 text-foreground/70" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-foreground/80" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              Plano {plan.name}
            </h1>
          </div>
          <p className="text-lg text-foreground/70">
            Termos, condições e política de tarifas
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Resumo */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Resumo do Plano</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Comissão por venda</p>
              <p className="text-3xl font-bold font-display text-primary">{plan.commission}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Mensalidade</p>
              <p className="text-lg font-bold font-display">{plan.monthlyFee}</p>
            </div>
          </div>
        </div>

        {/* Funcionalidades */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Funcionalidades Incluídas</h2>
          <ul className="space-y-3">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Termos */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Termos e Condições de Tarifas</h2>
          <ol className="space-y-4 list-decimal list-inside">
            {plan.terms.map((term, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-2">
                {term}
              </li>
            ))}
          </ol>
        </div>

        {/* Regra de fixação */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Regra de Fixação de Tarifa
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A tarifa de comissão é fixada no momento da criação de cada evento. 
            Se você alterar seu plano de assinatura, os eventos já criados com vendas de ingressos vigentes 
            <strong className="text-foreground"> manterão a tarifa original</strong>. 
            A nova tarifa será aplicada apenas aos eventos criados após a alteração do plano.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta regra garante transparência e previsibilidade tanto para o organizador quanto para a plataforma.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-6">
          <p className="text-sm text-muted-foreground">
            Dúvidas? Entre em contato pelo{" "}
            <a href="https://wa.me/558520103399" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              WhatsApp
            </a>{" "}
            ou por{" "}
            <a href="mailto:contato@upplin.com" className="text-primary underline">
              e-mail
            </a>.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button asChild>
              <Link to="/planos/organizador">Ver todos os planos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/organizador/cadastro">Criar conta de organizador</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
