import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { 
  Search, 
  MapPin, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  Music,
  PartyPopper,
  Theater,
  Trophy,
  GraduationCap,
  Utensils,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Story-style category item
function CategoryStory({ icon: Icon, name, color, href }: { 
  icon: React.ElementType; 
  name: string; 
  color: string;
  href: string;
}) {
  return (
    <Link to={href} className="flex flex-col items-center gap-2 shrink-0">
      <div className="avatar-ring-gradient p-[2px] rounded-full">
        <div className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center bg-background",
          color
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <span className="text-xs font-medium text-center max-w-[70px] truncate">{name}</span>
    </Link>
  );
}

// Trending section card
function TrendingCard({ title, subtitle, image, href }: {
  title: string;
  subtitle: string;
  image: string;
  href: string;
}) {
  return (
    <Link to={href} className="block relative rounded-2xl overflow-hidden aspect-[2/1] min-w-[280px]">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
          <TrendingUp className="h-3 w-3" />
          <span>{subtitle}</span>
        </div>
        <h3 className="font-display font-bold text-white">{title}</h3>
      </div>
    </Link>
  );
}

export default function Index() {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["homepage-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          organizer:organizer_id(display_name, logo_url)
        `)
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const categories = [
    { name: "Shows", icon: Music, color: "text-pink-500", href: "/eventos?categoria=shows" },
    { name: "Festas", icon: PartyPopper, color: "text-purple-500", href: "/eventos?categoria=festas" },
    { name: "Teatro", icon: Theater, color: "text-orange-500", href: "/eventos?categoria=teatro" },
    { name: "Esportes", icon: Trophy, color: "text-green-500", href: "/eventos?categoria=esportes" },
    { name: "Cursos", icon: GraduationCap, color: "text-blue-500", href: "/eventos?categoria=cursos" },
    { name: "Gastronomia", icon: Utensils, color: "text-red-500", href: "/eventos?categoria=gastronomia" },
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="pt-14">
        {/* Search Bar - Sticky */}
        <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 py-3">
          <div className="container">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 bg-muted rounded-full px-4 py-2.5">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar eventos, artistas..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
              <Button 
                type="button"
                variant="outline" 
                size="icon"
                className="rounded-full shrink-0"
                onClick={() => navigate("/eventos")}
              >
                <MapPin className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>

        {/* Categories - Stories Style */}
        <section className="py-4 border-b border-border/50">
          <div className="container">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {categories.map((cat) => (
                <CategoryStory key={cat.name} {...cat} />
              ))}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="py-6">
          <div className="container">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-display text-lg font-bold">Em Alta</h2>
              </div>
              <Link to="/eventos" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {trending.map((item) => (
                <TrendingCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* Feed Section - TikTok Style */}
        <section className="py-6">
          <div className="container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Para Você</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground text-sm">
                Seguindo
              </Button>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="feed-card animate-pulse bg-muted" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                {events.map((event: any, index: number) => (
                  <FeedEventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    coverImageUrl={event.cover_image_url}
                    startAt={event.start_at}
                    venueName={event.venue_name}
                    addressText={event.address_text}
                    organizerName={event.organizer?.display_name}
                    organizerAvatar={event.organizer?.logo_url}
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            <div className="flex justify-center mt-8">
              <Button variant="outline" size="lg" className="rounded-full" asChild>
                <Link to="/eventos">
                  Ver mais eventos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA for Organizers */}
        <section className="py-12 bg-foreground text-background">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-lg mx-auto"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                Crie seu evento
              </h2>
              <p className="text-background/70 mb-6">
                Venda ingressos e alcance milhares de pessoas. Comece grátis.
              </p>
              <Button 
                size="lg" 
                className="rounded-full bg-background text-foreground hover:bg-background/90"
                asChild
              >
                <Link to="/organizador/cadastro">
                  Começar agora
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
