import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Users, Search } from "lucide-react";
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
  { name: "Festival Brasil", slug: "festival-brasil", followers: "12.5k" },
  { name: "Noite SP", slug: "noite-sp", followers: "8.2k" },
  { name: "Rock in Rio", slug: "rock-in-rio", followers: "45.1k" },
];

export function RightSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside className="hidden xl:block w-[280px] 2xl:w-[320px] h-screen sticky top-0 overflow-y-auto shrink-0 pl-6 pr-4">
      <div className="py-6 space-y-6">
        {/* Search */}
        <button
          onClick={() => navigate("/eventos")}
          className="w-full flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3 text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-5 w-5" />
          <span className="text-sm">Buscar eventos...</span>
        </button>

        {/* User CTA or Suggested for You */}
        {user ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Sugestões para você
              </h3>
              <Link to="/explorar-organizadores" className="text-xs font-semibold text-primary hover:underline">
                Ver tudo
              </Link>
            </div>
            <div className="space-y-3">
              {suggestedOrganizers.map((org) => (
                <Link
                  key={org.slug}
                  to={`/organizador/${org.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent via-pink-500 to-purple-600 p-0.5">
                    <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-sm font-bold">
                      {org.name[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {org.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {org.followers} seguidores
                    </p>
                  </div>
                  <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    Seguir
                  </button>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
            <h3 className="font-display font-bold mb-2">Crie seu evento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece a vender ingressos hoje mesmo
            </p>
            <Button asChild size="sm" className="w-full rounded-full">
              <Link to="/organizador/cadastro">
                Começar grátis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Trending */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold">Em Alta</h3>
          </div>
          <div className="space-y-3">
            {trending.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="group block rounded-xl overflow-hidden"
              >
                <div className="relative aspect-[2.5/1] bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
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
          <h3 className="text-sm font-semibold mb-3">Explorar</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-muted/80 transition-colors"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground/60">
            <Link to="#" className="hover:text-muted-foreground hover:underline">Sobre</Link>
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Ajuda</Link>
            <span>·</span>
            <Link to="/precos" className="hover:text-muted-foreground hover:underline">Preços</Link>
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Termos</Link>
            <span>·</span>
            <Link to="#" className="hover:text-muted-foreground hover:underline">Privacidade</Link>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-3">
            © 2026 UPPLIN
          </p>
        </div>
      </div>
    </aside>
  );
}
