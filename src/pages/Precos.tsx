import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  ArrowRight, 
  Ticket, 
  Users, 
  BarChart3, 
  CreditCard,
  Shield,
  Zap,
  Headphones,
  QrCode,
  Mail,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "Perfeito para começar",
    price: "0",
    priceLabel: "Grátis para sempre",
    featured: false,
    features: [
      "Até 100 ingressos/mês",
      "1 evento ativo",
      "Check-in via QR Code",
      "Relatórios básicos",
      "Suporte por email",
    ],
    cta: "Começar grátis",
    ctaVariant: "outline" as const,
  },
  {
    name: "Professional",
    description: "Para organizadores sérios",
    price: "4,9",
    priceLabel: "por ingresso vendido",
    featured: true,
    features: [
      "Ingressos ilimitados",
      "Eventos ilimitados",
      "Check-in via QR Code",
      "Analytics avançado",
      "Pagamento em 24h",
      "Múltiplos tipos de ingresso",
      "Cupons de desconto",
      "Suporte prioritário",
    ],
    cta: "Escolher Professional",
    ctaVariant: "default" as const,
  },
  {
    name: "Enterprise",
    description: "Para grandes operações",
    price: "Sob consulta",
    priceLabel: "Plano personalizado",
    featured: false,
    features: [
      "Tudo do Professional",
      "Taxa negociável",
      "API completa",
      "Integrações customizadas",
      "Suporte dedicado 24/7",
      "SLA garantido",
      "White-label disponível",
      "Treinamento da equipe",
    ],
    cta: "Falar com vendas",
    ctaVariant: "outline" as const,
  },
];

const allFeatures = [
  { icon: Ticket, title: "Venda Ilimitada", description: "Sem limite de ingressos ou eventos" },
  { icon: CreditCard, title: "Pagamento Rápido", description: "Receba em até 24h após o evento" },
  { icon: QrCode, title: "Check-in Fácil", description: "Validação instantânea via QR Code" },
  { icon: BarChart3, title: "Analytics", description: "Relatórios detalhados em tempo real" },
  { icon: Shield, title: "Anti-fraude", description: "Proteção avançada contra fraudes" },
  { icon: Users, title: "Gestão", description: "Gerencie participantes facilmente" },
  { icon: Mail, title: "Comunicação", description: "Emails automáticos para compradores" },
  { icon: Headphones, title: "Suporte", description: "Equipe especializada para ajudar" },
  { icon: Globe, title: "Página do Evento", description: "Página personalizada para seu evento" },
  { icon: Zap, title: "Rápido", description: "Crie seu evento em minutos" },
];

const faqs = [
  {
    question: "Como funciona a cobrança?",
    answer: "Cobramos uma taxa por ingresso vendido. Você só paga quando vende. Não há mensalidade ou taxa de setup."
  },
  {
    question: "Quando recebo o dinheiro das vendas?",
    answer: "O repasse é feito em até 24 horas úteis após a realização do evento, diretamente na sua conta bancária."
  },
  {
    question: "Posso criar eventos gratuitos?",
    answer: "Sim! Eventos gratuitos não têm nenhuma taxa. Você pode criar quantos quiser no plano Professional."
  },
  {
    question: "Qual a taxa do plano Professional?",
    answer: "A taxa é de 4,9% + R$ 0,99 por ingresso vendido. Para eventos de grande porte, entre em contato para condições especiais."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, não há fidelidade. Você pode parar de usar a plataforma quando quiser, sem multas ou taxas."
  },
];

export default function Precos() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24">
        {/* Hero */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
                Preços simples,
                <br />
                <span className="gradient-text">sem surpresas</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Pague apenas quando vender. Sem mensalidade, sem taxa de adesão.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-10">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "relative rounded-3xl p-8 flex flex-col",
                    plan.featured
                      ? "bg-secondary text-secondary-foreground ring-2 ring-primary"
                      : "bg-card border border-border"
                  )}
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                        Mais popular
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className={cn(
                      "text-sm",
                      plan.featured ? "text-secondary-foreground/70" : "text-muted-foreground"
                    )}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      {plan.price !== "Sob consulta" && (
                        <span className={cn(
                          "text-sm",
                          plan.featured ? "text-secondary-foreground/70" : "text-muted-foreground"
                        )}>
                          R$
                        </span>
                      )}
                      <span className="font-display text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "Sob consulta" && plan.price !== "0" && (
                        <span className={cn(
                          "text-sm",
                          plan.featured ? "text-secondary-foreground/70" : "text-muted-foreground"
                        )}>
                          %
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-1",
                      plan.featured ? "text-secondary-foreground/70" : "text-muted-foreground"
                    )}>
                      {plan.priceLabel}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={cn(
                          "h-5 w-5 shrink-0 mt-0.5",
                          plan.featured ? "text-primary" : "text-primary"
                        )} />
                        <span className={cn(
                          "text-sm",
                          plan.featured ? "text-secondary-foreground/90" : ""
                        )}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={plan.ctaVariant}
                    size="lg"
                    className={cn(
                      "rounded-full w-full",
                      plan.featured && "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    <Link to={plan.name === "Enterprise" ? "/contato" : "/cadastro"}>
                      {plan.cta}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* All Features */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Tudo que você precisa
              </h2>
              <p className="text-lg text-muted-foreground">
                Recursos poderosos para criar eventos de sucesso
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {allFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-2xl bg-card border border-border text-center"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Perguntas frequentes
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-secondary text-secondary-foreground">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Pronto para começar?
              </h2>
              <p className="text-secondary-foreground/70 mb-8">
                Crie sua conta em segundos e comece a vender ingressos hoje mesmo
              </p>
              <Button asChild size="xl" variant="hero" className="rounded-full">
                <Link to="/cadastro">
                  Criar conta grátis
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
