import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CreditCard, Shield, Ticket, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Ticket, text: "Ingressos ilimitados" },
  { icon: CreditCard, text: "Receba em 24h" },
  { icon: Users, text: "Gestão de participantes" },
  { icon: BarChart3, text: "Analytics detalhado" },
  { icon: Shield, text: "Anti-fraude incluso" },
  { icon: Zap, text: "Setup em 5 minutos" },
];

export function OrganizerCTA() {
  return (
    <section className="py-16 bg-secondary overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-medium">
                Para Organizadores
              </span>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-foreground leading-tight">
                Crie eventos, divulgue e venda ingressos com{" "}
                <span className="gradient-text">facilidade</span>
              </h2>
              <p className="text-lg text-secondary-foreground/70">
                A plataforma completa para você focar no que importa: criar experiências memoráveis. 
                Nós cuidamos da tecnologia.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.text}
                  className="flex items-center gap-2 text-secondary-foreground/80"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Button size="xl" variant="hero" asChild className="group">
                <Link to="/organizador/cadastro">
                  Criar meu evento
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="xl" variant="hero-outline" asChild>
                <Link to="/organizadores">
                  Ver como funciona
                </Link>
              </Button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Dashboard mockup */}
              <div className="bg-background rounded-2xl shadow-2xl border border-border/20 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-8 w-24 bg-primary/20 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="text-3xl font-bold text-primary">847</div>
                      <div className="text-sm text-muted-foreground">Ingressos</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="text-3xl font-bold text-success">R$ 42k</div>
                      <div className="text-sm text-muted-foreground">Receita</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="text-3xl font-bold text-accent">94%</div>
                      <div className="text-sm text-muted-foreground">Check-in</div>
                    </div>
                  </div>
                  <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-xl" />
                </div>
              </div>
              
              {/* Floating cards */}
              <div className="absolute -top-6 -left-6 bg-background p-4 rounded-xl shadow-xl border animate-fade-up">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Nova venda!</div>
                    <div className="text-xs text-muted-foreground">Agora mesmo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
