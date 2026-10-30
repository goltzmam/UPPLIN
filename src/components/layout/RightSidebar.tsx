import { Capacitor } from "@capacitor/core";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const categories = [
  { name: "Festas", icon: "🎉", href: "/eventos?categoria=festas" },
  { name: "Shows", icon: "🎤", href: "/eventos?categoria=shows" },
  { name: "Festivais", icon: "🎪", href: "/eventos?categoria=festivais" },
  { name: "Esportes", icon: "⚽", href: "/eventos?categoria=esportes" },
  { name: "Teatro", icon: "🎭", href: "/eventos?categoria=teatro" },
  { name: "Workshops", icon: "💡", href: "/eventos?categoria=workshops" },
  { name: "Gastronomia", icon: "🍽️", href: "/eventos?categoria=gastronomia" },
  { name: "Arte", icon: "🎨", href: "/eventos?categoria=arte" },
];

const trending = [
  { 
    title: "Festivais de Verão", 
    subtitle: "Em alta agora", 
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
    href: "/eventos?categoria=festivais"
  },
  { 
    title: "Shows Internacionais", 
    subtitle: "Mais buscados", 
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
    href: "/eventos?categoria=shows"
  },
];

const suggestedOrganizers = [
  { name: "Festival Brasil", slug: "festival-brasil", followers: "12.5k", avatar: "🎪" },
  { name: "Noite SP", slug: "noite-sp", followers: "8.2k", avatar: "🌃" },
  { name: "Rock in Rio", slug: "rock-in-rio", followers: "45.1k", avatar: "🎸" },
];

export function RightSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside className="hidden lg:block w-[280px] xl:w-[320px] 2xl:w-[350px] h-screen sticky top-0 overflow-y-auto shrink-0 border-l border-border/30">
      <div className="py-6 px-5 space-y-6">
        {/* Search Bar */}
        <button
          onClick={() => navigate("/eventos")}
          className="w-full flex items-center gap-3 bg-muted/60 hover:bg-muted rounded-xl px-4 py-3 text-muted-foreground transition-all duration-200 group"
        >
          <Search className="h-4 w-4 group-hover:text-foreground transition-colors" />
          <span className="text-sm">Buscar eventos...</span>
        </button>

        {/* Suggestions or CTA */}
        {user ? (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                Sugestões para você
              </span>
              <Link to="/explorar-organizadores" className="text-xs font-semibold text-primary hover:underline">
                Ver tudo
              </Link>
            </div>
            <div className="space-y-4">
              {suggestedOrganizers.map((org) => (
                <div
                  key={org.slug}
                  className="flex items-center gap-3 group"
                >
                  <Link 
                    to={`/organizador/${org.slug}`}
                    className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center text-lg shrink-0 hover:scale-105 transition-transform"
                  >
                    {org.avatar}
                  </Link>
                  <Link to={`/organizador/${org.slug}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {org.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {org.followers} seguidores
                    </p>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg text-xs font-semibold shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Follow logic
                    }}
                  >
                    Seguir
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background rounded-2xl p-5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Crie seu evento</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Comece a vender ingressos hoje mesmo
            </p>
            <Button asChild size="sm" className="w-full rounded-lg">
              <Link to="/organizador/cadastro">
                Começar grátis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Trending Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Em Alta</h3>
          </div>
          <div className="space-y-3">
            {trending.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="group block rounded-xl overflow-hidden border border-border/50 hover:border-border transition-colors"
              >
                <div className="relative aspect-[2.2/1] bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <div className="text-white/70 text-[10px] uppercase tracking-wide mb-0.5">
                      {item.subtitle}
                    </div>
                    <p className="text-white text-sm font-semibold">{item.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Explorar categorias</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.href}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/60 hover:bg-muted rounded-full text-xs font-medium transition-colors"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground/60">
            <Link to="#" className="hover:text-muted-foreground hover:underline">Sobre</Link>
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Ajuda</Link>
            <span>·</span>
            {!Capacitor.isNativePlatform() && <Link to="/precos" className="hover:text-muted-foreground hover:underline">Preços</Link>}
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Termos</Link>
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Privacidade</Link>
          </div>
          <p className="text-[11px] text-muted-foreground/50 mt-3">
            © 2026 UPPLIN
          </p>
        </div>
      </div>
    </aside>
  );
}
