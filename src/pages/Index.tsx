import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Shield, Zap, Users, BarChart3, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import heroImage from "@/assets/hero-events.jpg";

const features = [
  { icon: Ticket, title: "Venda Online", description: "Venda ingressos 24/7 com checkout seguro e múltiplas formas de pagamento." },
  { icon: Users, title: "Gestão Completa", description: "Gerencie participantes, check-in via QR Code e controle de acesso." },
  { icon: BarChart3, title: "Analytics em Tempo Real", description: "Acompanhe vendas, receita e métricas importantes do seu evento." },
  { icon: Shield, title: "Segurança Total", description: "Transações seguras, ingressos com QR Code único e anti-fraude." },
  { icon: Zap, title: "Fácil e Rápido", description: "Crie seu evento em minutos e comece a vender imediatamente." },
  { icon: Calendar, title: "Eventos de Qualquer Tipo", description: "Shows, festas, conferências, workshops e muito mais." },
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroImage} alt="Evento" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-transparent" />
          </div>
          
          <div className="container relative z-10 py-20">
            <div className="max-w-2xl space-y-6 animate-fade-up">
              <h1 className="font-display text-4xl md:text-6xl font-bold text-secondary-foreground leading-tight">
                Crie experiências <span className="gradient-text">inesquecíveis</span>
              </h1>
              <p className="text-lg md:text-xl text-secondary-foreground/80">
                A plataforma completa para criar, gerenciar e vender ingressos para seus eventos. 
                Simples, seguro e poderoso.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/cadastro">
                    Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="hero-outline" asChild>
                  <Link to="/eventos">Explorar Eventos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Tudo que você precisa para seu evento
              </h2>
              <p className="text-muted-foreground">
                Ferramentas profissionais para organizadores de todos os tamanhos
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-card border border-border hover-lift animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <div className="relative rounded-3xl overflow-hidden bg-secondary p-8 md:p-16 text-center">
              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-secondary-foreground">
                  Pronto para criar seu evento?
                </h2>
                <p className="text-secondary-foreground/80">
                  Junte-se a milhares de organizadores que confiam na Influente
                </p>
                <Button size="xl" variant="hero" asChild>
                  <Link to="/cadastro">Criar Conta Grátis</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
