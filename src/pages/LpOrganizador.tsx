import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  Zap, BarChart3, QrCode, Tag, Shield, Smartphone,
  Users, TrendingUp, ArrowRight, Check, Star, ChevronDown,
  CreditCard, Clock, Globe, Headphones, MessageSquare, Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Easing } from "framer-motion";

// Images
import dashboardImg from "@/assets/lp/dashboard-preview.jpg";
import checkinImg from "@/assets/lp/checkin-mobile.jpg";
import heroEventImg from "@/assets/lp/hero-event.jpg";
import avatar1 from "@/assets/avatars/avatar-1.jpg";
import avatar2 from "@/assets/avatars/avatar-2.jpg";
import avatar3 from "@/assets/avatars/avatar-3.jpg";

const easeOut: Easing = [0, 0, 0.2, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: easeOut }
  })
};

const features = [
  { icon: Ticket, title: "Eventos Ilimitados", desc: "Crie quantos eventos quiser, sem limites. De festas íntimas a festivais." },
  { icon: QrCode, title: "Check-in QR Code", desc: "Validação instantânea na entrada. Sem filas, sem papelada." },
  { icon: BarChart3, title: "Dashboard Analítico", desc: "Acompanhe vendas, público e receita em tempo real." },
  { icon: Tag, title: "Cupons de Desconto", desc: "Crie promoções e cupons personalizados para impulsionar vendas." },
  { icon: CreditCard, title: "Checkout Transparente", desc: "Pix e cartão direto no app. Sem redirecionamentos." },
  { icon: Shield, title: "Segurança Total", desc: "Dados criptografados, antifraude e ingressos únicos com QR." },
  { icon: Smartphone, title: "Mobile First", desc: "Plataforma otimizada para celular. Seus clientes compram em segundos." },
  { icon: Users, title: "Gestão de Equipe", desc: "Adicione colaboradores para check-in sem compartilhar sua conta." },
  { icon: Globe, title: "Perfil Público", desc: "Página exclusiva do organizador com todos seus eventos e avaliações." },
  { icon: Clock, title: "PIX Instantâneo", desc: "Receba pagamentos via PIX em tempo real, sem esperar dias." },
  { icon: MessageSquare, title: "Chat Direto", desc: "Converse com participantes diretamente pela plataforma." },
  { icon: TrendingUp, title: "Relatórios Avançados", desc: "Exportação de dados, funil de vendas e análise de público." },
];

const plans = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    commission: "10%",
    highlight: false,
    features: [
      "Eventos ilimitados",
      "Check-in QR Code",
      "Dashboard básico",
      "Cupons de desconto",
      "Suporte por chat",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    commission: "7%",
    highlight: true,
    features: [
      "Tudo do Grátis",
      "Comissão reduzida (7%)",
      "Relatórios avançados",
      "Suporte prioritário",
      "Cupons ilimitados",
      "Exportação de dados",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 199",
    period: "/mês",
    commission: "5%",
    highlight: false,
    features: [
      "Tudo do Pro",
      "Menor comissão (5%)",
      "Dashboard financeiro completo",
      "API de integração",
      "Gerente de conta dedicado",
      "Suporte 24/7",
    ],
  },
];

const faqs = [
  { q: "Quanto tempo leva para começar a vender?", a: "Menos de 5 minutos. Crie sua conta, cadastre seu evento e já pode vender ingressos imediatamente." },
  { q: "Quando recebo o dinheiro das vendas?", a: "Os pagamentos via PIX são instantâneos. Para cartão de crédito, o prazo segue as condições do Mercado Pago." },
  { q: "Posso usar minha própria conta do Mercado Pago?", a: "Sim! Conecte sua conta do Mercado Pago e receba diretamente. A UPPLIN cobra apenas a comissão do plano." },
  { q: "Existe contrato de fidelidade?", a: "Não! Você pode cancelar ou trocar de plano a qualquer momento, sem multas." },
  { q: "Como funciona o check-in?", a: "Cada ingresso tem um QR Code único. Você ou seus colaboradores escaneiam na entrada com o celular." },
];

const stats = [
  { value: "10K+", label: "Ingressos vendidos" },
  { value: "500+", label: "Eventos criados" },
  { value: "98%", label: "Satisfação" },
  { value: "< 5min", label: "Para começar" },
];

export default function LpOrganizador() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const goRegister = () => navigate("/organizador/cadastro");
  const goLogin = () => navigate("/organizador/login");

  // SEO: dynamic meta tags
  useEffect(() => {
    document.title = "Venda Ingressos Online | UPPLIN para Organizadores";
    
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", "Plataforma completa para venda de ingressos online. Crie eventos, venda com PIX e cartão, check-in QR Code. Comece grátis!");
    setMeta("keywords", "venda ingressos online, plataforma eventos, check-in QR code, organizador de eventos, ingressos PIX");
    setMeta("og:title", "Venda Ingressos Online | UPPLIN para Organizadores", true);
    setMeta("og:description", "Plataforma completa para venda de ingressos online. Crie eventos, venda com PIX e cartão, check-in QR Code.", true);
    setMeta("og:image", window.location.origin + "/og-organizador.jpg", true);
    setMeta("og:url", window.location.href, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:title", "Venda Ingressos Online | UPPLIN para Organizadores");
    setMeta("twitter:description", "Plataforma completa para venda de ingressos. Comece grátis!");
    setMeta("twitter:image", window.location.origin + "/og-organizador.jpg");

    // JSON-LD
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.id = "lp-jsonld";
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "UPPLIN",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Plataforma completa para organizadores de eventos. Venda ingressos online com PIX, cartão, check-in QR Code e dashboard analítico.",
      "offers": [
        { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "BRL" },
        { "@type": "Offer", "name": "Pro", "price": "49", "priceCurrency": "BRL" },
        { "@type": "Offer", "name": "Enterprise", "price": "199", "priceCurrency": "BRL" }
      ],
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "500" }
    });
    document.head.appendChild(jsonLd);

    return () => {
      document.getElementById("lp-jsonld")?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── URGENCY BANNER ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] text-white text-center py-2 px-4">
        <p className="text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <strong>127+ organizadores</strong> já estão vendendo na UPPLIN
          </span>
        </p>
      </div>

      <nav className="fixed top-[36px] sm:top-[36px] left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] bg-clip-text text-transparent">
            UPPLIN
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={goLogin} className="text-muted-foreground hover:text-foreground">
              Entrar
            </Button>
            <Button size="sm" onClick={goRegister} className="bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] text-white border-0 hover:opacity-90">
              Criar Conta Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-20 sm:pt-48 sm:pb-28 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#FF6A00]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#FF007A]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm text-xs font-medium text-muted-foreground mb-6"
          >
            <Zap className="w-3.5 h-3.5 text-[#FF6A00]" />
            Plataforma #1 para eventos no Brasil
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6"
          >
            Venda ingressos.{" "}
            <span className="bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] bg-clip-text text-transparent">
              Sem complicação.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            A UPPLIN é a plataforma completa para organizadores de eventos.
            Crie, venda e gerencie tudo em um só lugar — do cadastro ao check-in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              onClick={goRegister}
              className="w-full sm:w-auto bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] text-white border-0 hover:opacity-90 text-base px-8 h-12 font-bold shadow-lg shadow-[#FF2D2D]/20"
            >
              Começar Grátis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("precos")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto h-12 text-base border-border/60"
            >
              Ver Planos
            </Button>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 sm:mt-16"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-[#FF2D2D]/10">
              <img
                src={heroEventImg}
                alt="Evento vibrante com público animado"
                className="w-full h-auto object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-12 border-y border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Tudo que você precisa,{" "}
              <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                em um só lugar
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Ferramentas profissionais para transformar seus eventos em experiências inesquecíveis.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="group p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A00]/20 to-[#FF007A]/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD SHOWCASE ── */}
      <section className="py-20 sm:py-28 px-4 bg-card/30 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Dashboard completo para{" "}
                <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                  controlar tudo
                </span>
              </h2>
              <p className="text-muted-foreground text-base mb-6 leading-relaxed">
                Acompanhe vendas em tempo real, veja gráficos de receita, monitore check-ins e gerencie 
                todos os seus eventos em um painel intuitivo e profissional.
              </p>
              <ul className="space-y-3">
                {["Vendas e receita em tempo real", "Gráficos e relatórios exportáveis", "Gestão de ingressos e cupons", "Visão geral de todos os eventos"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-[#FF2D2D]/10"
                whileInView={{ y: [0, -8, 0] }}
                viewport={{ once: false }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src={dashboardImg} alt="Dashboard do organizador UPPLIN com gráficos de vendas" className="w-full h-auto" loading="lazy" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CHECK-IN SHOWCASE ── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.9, rotateX: 10 }}
              whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="order-2 lg:order-1"
            >
              <motion.div
                className="max-w-sm mx-auto rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-[#FF2D2D]/10"
                whileInView={{ y: [0, -10, 0] }}
                viewport={{ once: false }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <img src={checkinImg} alt="Check-in por QR Code no celular na entrada do evento" className="w-full h-auto" loading="lazy" />
              </motion.div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Check-in{" "}
                <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                  instantâneo
                </span>{" "}pelo celular
              </h2>
              <p className="text-muted-foreground text-base mb-6 leading-relaxed">
                Esqueça listas de papel e filas intermináveis. Com o QR Code da UPPLIN, 
                seus colaboradores fazem check-in em segundos direto do celular.
              </p>
              <ul className="space-y-3">
                {["QR Code único por ingresso", "Validação offline disponível", "Múltiplos colaboradores simultâneos", "Relatório de check-in em tempo real"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 sm:py-28 px-4 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Quem usa,{" "}
              <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                recomenda
              </span>
            </h2>
            <p className="text-muted-foreground">Veja o que organizadores reais dizem sobre a UPPLIN</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Mariana Silva",
                role: "Produtora de festas • SP",
                avatar: avatar1,
                quote: "A UPPLIN revolucionou meus eventos. O check-in por QR Code acabou com as filas e o dashboard me dá controle total das vendas em tempo real.",
                rating: 5,
              },
              {
                name: "Lucas Ferreira",
                role: "Organizador de shows • RJ",
                avatar: avatar2,
                quote: "Migrei de outra plataforma e não me arrependo. A comissão é justa, o suporte é rápido e meus clientes adoram a experiência de compra.",
                rating: 5,
              },
              {
                name: "Camila Rodrigues",
                role: "Gestora de eventos corporativos • MG",
                avatar: avatar3,
                quote: "Uso o plano Pro e o retorno é incrível. Os cupons de desconto e os relatórios detalhados me ajudam a tomar decisões mais inteligentes.",
                rating: 5,
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm p-6 flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-[#FF6A00] text-[#FF6A00]" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground flex-1 mb-5">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF2D2D]/20"
                  />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 sm:py-28 px-4 bg-card/30 border-y border-border/40">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Comece em{" "}
              <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">3 passos simples</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Crie sua conta", desc: "Cadastre-se gratuitamente em menos de 2 minutos." },
              { step: "02", title: "Publique seu evento", desc: "Adicione fotos, vídeos, ingressos e pronto." },
              { step: "03", title: "Venda e gerencie", desc: "Acompanhe vendas e faça check-in pelo celular." },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
                <div className="text-5xl font-black bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Planos que{" "}
              <span className="bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
                cabem no seu bolso
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Comece grátis. Escale quando precisar. Sem surpresas.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                  plan.highlight
                    ? "border-[#FF2D2D]/60 bg-gradient-to-b from-card to-[#FF2D2D]/5 shadow-lg shadow-[#FF2D2D]/10"
                    : "border-border/50 bg-card/50"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF007A] text-white text-xs font-bold">
                    Mais Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Comissão: <span className="font-semibold text-foreground">{plan.commission}</span> por venda
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-[#FF2D2D] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={goRegister}
                  className={`w-full h-11 font-bold ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] text-white border-0 hover:opacity-90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {plan.price === "R$ 0" ? "Começar Grátis" : "Assinar Agora"}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL / SOCIAL PROOF ── */}
      <section className="py-20 sm:py-28 px-4 bg-card/30 border-y border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#FF6A00] text-[#FF6A00]" />
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed mb-6 max-w-2xl mx-auto">
              "A UPPLIN revolucionou meus eventos. O check-in por QR é incrível e o suporte é sensacional.
              Nunca mais volto para outra plataforma."
            </blockquote>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Carlos Silva</span> · Organizador de Festas · São Paulo
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Perguntas Frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="border border-border/50 rounded-xl overflow-hidden bg-card/50"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 sm:p-5 text-left font-medium text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-4 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed -mt-1">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF6A00]/5 via-[#FF2D2D]/5 to-[#FF007A]/5 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6">
              Pronto para transformar{" "}
              <span className="bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] bg-clip-text text-transparent">
                seus eventos?
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Junte-se a centenas de organizadores que já confiam na UPPLIN. Comece grátis, sem cartão.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={goRegister}
                className="w-full sm:w-auto bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] text-white border-0 hover:opacity-90 text-base px-10 h-13 font-bold shadow-lg shadow-[#FF2D2D]/20"
              >
                Criar Conta Grátis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={goLogin}
                className="w-full sm:w-auto text-base text-muted-foreground hover:text-foreground"
              >
                Já tenho conta
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold bg-gradient-to-r from-[#FF6A00] to-[#FF007A] bg-clip-text text-transparent">
            UPPLIN
          </span>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} UPPLIN. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
