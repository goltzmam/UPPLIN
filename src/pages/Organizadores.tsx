import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
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
  Globe,
  CheckCircle,
  Play,
  Smartphone,
  PieChart,
  TrendingUp,
  Clock,
  Award
} from "lucide-react";

const features = [
  {
    icon: Ticket,
    title: "Venda ilimitada",
    description: "Sem limite de ingressos. Venda quantos precisar, quando precisar.",
  },
  {
    icon: CreditCard,
    title: "Receba em 24h",
    description: "O dinheiro das vendas cai na sua conta em até 24 horas úteis.",
  },
  {
    icon: QrCode,
    title: "Check-in inteligente",
    description: "Validação instantânea via QR Code. Funciona offline.",
  },
  {
    icon: BarChart3,
    title: "Analytics em tempo real",
    description: "Acompanhe vendas, receita e métricas importantes ao vivo.",
  },
  {
    icon: Shield,
    title: "Anti-fraude",
    description: "Sistema avançado de proteção contra fraudes e chargebacks.",
  },
  {
    icon: Users,
    title: "Gestão de participantes",
    description: "Lista completa de compradores com filtros e exportação.",
  },
];

const steps = [
  {
    step: "01",
    title: "Crie seu evento",
    description: "Configure título, data, local e tipos de ingresso em minutos.",
  },
  {
    step: "02",
    title: "Personalize",
    description: "Adicione imagens, descrição e defina preços para cada lote.",
  },
  {
    step: "03",
    title: "Publique",
    description: "Seu evento fica disponível instantaneamente para vendas.",
  },
  {
    step: "04",
    title: "Gerencie",
    description: "Acompanhe vendas, faça check-in e receba seu dinheiro.",
  },
];

const testimonials = [
  {
    quote: "Migrei para a Influente e minhas vendas aumentaram 40%. A experiência do comprador é muito melhor.",
    author: "Carlos Mendes",
    role: "Produtor, Festa XYZ",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
  },
  {
    quote: "O suporte é incrível. Tive um problema às 3 da manhã e resolveram em minutos.",
    author: "Ana Paula",
    role: "Organizadora, Tech Meetup SP",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    quote: "Finalmente uma plataforma que pensa no organizador. Simples, rápida e confiável.",
    author: "Roberto Silva",
    role: "CEO, Eventos Pro",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
];

const stats = [
  { value: "2M+", label: "Ingressos vendidos" },
  { value: "50k+", label: "Eventos realizados" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9/5", label: "Avaliação" },
];

export default function Organizadores() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <main>
        {/* Hero */}
        <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
          {/* Background */}
          <motion.div 
            style={{ y: heroY }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/95 to-primary/20" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80')] bg-cover bg-center opacity-20" />
          </motion.div>

          <motion.div 
            style={{ opacity: heroOpacity }}
            className="container relative z-10 py-32"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-8"
                >
                  <Award className="h-4 w-4" />
                  Plataforma #1 do Brasil
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground leading-[0.95] mb-6"
                >
                  Crie eventos
                  <br />
                  <span className="gradient-text">extraordinários</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-secondary-foreground/70 mb-10 max-w-lg"
                >
                  A plataforma completa para vender ingressos, gerenciar participantes 
                  e criar experiências memoráveis.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4"
                >
                  <Button asChild size="xl" variant="hero" className="rounded-full text-lg">
                    <Link to="/organizador/cadastro">
                      Começar grátis
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button 
                    variant="hero-outline" 
                    size="xl" 
                    className="rounded-full text-lg group"
                  >
                    <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    Ver demo
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-8 mt-12 pt-8 border-t border-secondary-foreground/10"
                >
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label}>
                      <div className="font-display text-2xl font-bold text-secondary-foreground">
                        {stat.value}
                      </div>
                      <div className="text-sm text-secondary-foreground/60">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="hidden lg:block relative"
              >
                <div className="relative">
                  {/* Main Dashboard Card */}
                  <div className="bg-background rounded-3xl shadow-2xl border border-border/20 p-6 transform rotate-2">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-32 bg-muted rounded-lg" />
                        <div className="h-10 w-24 bg-primary/20 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted/50 rounded-2xl">
                          <TrendingUp className="h-5 w-5 text-primary mb-2" />
                          <div className="text-2xl font-bold">847</div>
                          <div className="text-xs text-muted-foreground">Vendas</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-2xl">
                          <PieChart className="h-5 w-5 text-success mb-2" />
                          <div className="text-2xl font-bold text-success">R$ 42k</div>
                          <div className="text-xs text-muted-foreground">Receita</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-2xl">
                          <Clock className="h-5 w-5 text-accent mb-2" />
                          <div className="text-2xl font-bold">94%</div>
                          <div className="text-xs text-muted-foreground">Check-in</div>
                        </div>
                      </div>
                      <div className="h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl" />
                    </div>
                  </div>

                  {/* Floating Notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -top-4 -left-4 bg-background p-4 rounded-2xl shadow-xl border flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Nova venda!</div>
                      <div className="text-xs text-muted-foreground">Agora mesmo</div>
                    </div>
                  </motion.div>

                  {/* Mobile Preview */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute -bottom-8 -right-8 bg-background p-4 rounded-3xl shadow-xl border w-48"
                  >
                    <Smartphone className="h-5 w-5 text-muted-foreground mb-3" />
                    <div className="text-sm font-medium">App Check-in</div>
                    <div className="text-xs text-muted-foreground">Escaneie e valide</div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="py-32">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
                Tudo que você precisa para
                <br />
                <span className="gradient-text">eventos de sucesso</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Ferramentas poderosas para organizar, vender e gerenciar qualquer tipo de evento.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-32 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
                Comece em minutos
              </h2>
              <p className="text-xl text-muted-foreground">
                Criar um evento nunca foi tão fácil
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative text-center"
                >
                  <div className="font-display text-7xl font-bold text-primary/10 mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                  
                  {index < steps.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute top-12 -right-4 h-8 w-8 text-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
                Amado por organizadores
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-8 rounded-3xl bg-card border border-border"
                >
                  <blockquote className="text-lg mb-6">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 bg-secondary text-secondary-foreground">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
                Pronto para começar?
              </h2>
              <p className="text-xl text-secondary-foreground/70 mb-10">
                Crie sua conta em segundos e comece a vender ingressos hoje mesmo. 
                Sem taxa de adesão, sem mensalidade.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="xl" variant="hero" className="rounded-full text-lg">
                  <Link to="/organizador/cadastro">
                    Criar conta grátis
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="hero-outline" size="xl" className="rounded-full text-lg">
                  <Link to="/precos">Ver preços</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
