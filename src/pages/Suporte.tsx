import { Link } from "react-router-dom";
import { Mail, MessageCircle, Phone, HelpCircle, Clock, Shield, FileText, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";

const channels = [
  {
    icon: Mail,
    title: "E-mail",
    value: "suporte@upplin.com",
    description: "Resposta em até 24h úteis",
    href: "mailto:suporte@upplin.com",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    value: "(85) 2010-3399",
    description: "Atendimento rápido pelo chat",
    href: "https://wa.me/558520103399",
  },
  {
    icon: Phone,
    title: "Telefone",
    value: "(85) 2010-3399",
    description: "Seg a Sex, 9h às 18h (BRT)",
    href: "tel:+558520103399",
  },
];

export default function Suporte() {
  return (
    <div className="min-h-screen bg-background text-foreground lg:ml-[72px] pb-24 lg:pb-12">
      <Helmet>
        <title>Suporte UPPLIN — Fale com a gente</title>
        <meta
          name="description"
          content="Central de suporte da UPPLIN. Tire dúvidas, resolva problemas com ingressos, eventos ou sua conta. Atendimento por e-mail, WhatsApp e telefone."
        />
        <link rel="canonical" href="https://www.upplin.com/suporte" />
        <meta property="og:title" content="Suporte UPPLIN" />
        <meta
          property="og:description"
          content="Fale com o time da UPPLIN. Ajuda para participantes e organizadores."
        />
        <meta property="og:url" content="https://www.upplin.com/suporte" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, hsl(20 100% 50% / 0.3), transparent 50%), radial-gradient(circle at 80% 60%, hsl(330 100% 50% / 0.25), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto px-6 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/50 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Central de ajuda
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight mb-5">
            Estamos aqui pra{" "}
            <span className="bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] bg-clip-text text-transparent">
              te ajudar
            </span>
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            Dúvidas sobre ingressos, problemas com pagamento, sugestões ou parcerias.
            Nosso time responde rapidinho.
          </p>
        </div>
      </section>

      {/* Canais */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Fale com a gente</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group relative p-6 rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FF007A] flex items-center justify-center mb-4">
                <c.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
              <p className="text-foreground font-medium mb-2">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Para organizadores */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-3xl p-8 lg:p-10 bg-gradient-to-br from-card to-card/40 border border-border/50">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                <Shield className="h-4 w-4" />
                Suporte para organizadores
              </div>
              <h3 className="text-2xl font-bold mb-2">É produtor de eventos?</h3>
              <p className="text-muted-foreground max-w-xl">
                Suporte prioritário para criação de eventos, repasses, check-in,
                cupons e análise de vendas. Acesse o painel ou fale conosco.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                to="/organizador/painel"
                className="px-6 py-3 rounded-2xl bg-foreground text-background font-semibold text-center hover:opacity-90 transition"
              >
                Acessar painel
              </Link>
              <a
                href="mailto:suporte@upplin.com"
                className="px-6 py-3 rounded-2xl border border-border font-semibold text-center hover:bg-muted transition"
              >
                suporte@upplin.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Links úteis */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-6">Acesso rápido</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { to: "/faq", label: "Perguntas frequentes", icon: HelpCircle, desc: "Respostas para as dúvidas mais comuns" },
            { to: "/termos", label: "Termos de uso", icon: FileText, desc: "Como funciona o uso da plataforma" },
            { to: "/privacidade", label: "Política de privacidade", icon: Shield, desc: "Como tratamos seus dados" },
            { to: "/meus-ingressos", label: "Meus ingressos", icon: Sparkles, desc: "Acesse seus QR Codes" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/40 hover:border-primary/40 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <l.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold mb-0.5">{l.label}</h4>
                <p className="text-sm text-muted-foreground">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Horário */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Atendimento de segunda a sexta, das 9h às 18h (horário de Brasília)
        </div>
      </section>
    </div>
  );
}
