import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/EventCard";
import { 
  Search, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Play,
  Ticket,
  BarChart3,
  Shield,
  Zap,
  Users,
  ArrowRight,
  Star,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// Premium Event Card with hover effects
function PremiumEventCard({ event, index }: { event: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Link 
        to={`/evento/${event.id}`}
        className="group block relative overflow-hidden rounded-3xl bg-card"
      >
        <div className="aspect-[4/5] relative overflow-hidden">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20" />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
          
          {/* Play button on hover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-100 scale-75">
              <Play className="h-6 w-6 text-white ml-1" />
            </div>
          </motion.div>
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
              <Calendar className="h-4 w-4" />
              <span>{new Date(event.start_at).toLocaleDateString('pt-BR', { 
                day: 'numeric', 
                month: 'short' 
              })}</span>
              {event.venue_name && (
                <>
                  <span>•</span>
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{event.venue_name}</span>
                </>
              )}
            </div>
            <h3 className="font-display text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
              {event.title}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Index() {
  const [searchValue, setSearchValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["homepage-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue) params.set("q", searchValue);
    if (locationValue) params.set("cidade", locationValue);
    navigate(`/eventos?${params.toString()}`);
  };

  const categories = [
    { name: "Shows", emoji: "🎸", color: "from-pink-500 to-rose-500" },
    { name: "Festas", emoji: "🎉", color: "from-purple-500 to-violet-500" },
    { name: "Teatro", emoji: "🎭", color: "from-orange-500 to-amber-500" },
    { name: "Esportes", emoji: "⚽", color: "from-green-500 to-emerald-500" },
    { name: "Cursos", emoji: "📚", color: "from-blue-500 to-cyan-500" },
    { name: "Gastronomia", emoji: "🍷", color: "from-red-500 to-pink-500" },
  ];

  const stats = [
    { value: "2M+", label: "Ingressos vendidos" },
    { value: "50k+", label: "Eventos realizados" },
    { value: "98%", label: "Satisfação" },
    { value: "24h", label: "Suporte" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header showSearch onSearchVisible={(visible) => setHeroSearchVisible(!visible)} />

      <main>
        {/* Hero Section - Fullscreen Cinematic */}
        <section ref={heroRef} className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
          {/* Background Video/Image */}
          <motion.div 
            style={{ scale: heroScale, y: heroY }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-secondary/40 to-secondary" />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-transparent to-transparent" />
          </motion.div>

          {/* Content */}
          <motion.div 
            style={{ opacity: heroOpacity }}
            className="container relative z-10 pt-20"
          >
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/90 text-sm mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Mais de 2 milhões de ingressos vendidos
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-6"
              >
                Experiências
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  inesquecíveis
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12"
              >
                Descubra os melhores eventos do Brasil.
                <br className="hidden md:block" />
                Shows, festas, conferências e muito mais.
              </motion.p>

              {/* Search Bar - Hero Version */}
              <AnimatePresence>
                {heroSearchVisible && (
                  <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.6 }}
                    onSubmit={handleSearch}
                    className="relative max-w-3xl mx-auto"
                  >
                    <div className="flex flex-col md:flex-row gap-3 p-3 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                      <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/10 rounded-2xl">
                        <Search className="h-5 w-5 text-white/60" />
                        <input
                          type="text"
                          placeholder="Buscar shows, festas, eventos..."
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-2xl md:w-48">
                        <MapPin className="h-5 w-5 text-white/60" />
                        <input
                          type="text"
                          placeholder="Localização"
                          value={locationValue}
                          onChange={(e) => setLocationValue(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/50"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        size="lg" 
                        className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-lg font-semibold"
                      >
                        Buscar
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
          >
            <span className="text-sm">Role para explorar</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </motion.div>
        </section>

        {/* Categories - Horizontal Scroll */}
        <section className="py-20 bg-background">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  Explore por categoria
                </h2>
                <p className="text-muted-foreground text-lg">
                  Encontre exatamente o que você procura
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat, index) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/eventos?categoria=${cat.name.toLowerCase()}`}
                    className="group block relative overflow-hidden rounded-3xl aspect-square"
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity",
                      cat.color
                    )} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <span className="text-5xl mb-3 group-hover:scale-125 transition-transform duration-300">
                        {cat.emoji}
                      </span>
                      <span className="font-semibold text-lg">{cat.name}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Events */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  Em destaque
                </h2>
                <p className="text-muted-foreground text-lg">
                  Os eventos mais aguardados do momento
                </p>
              </div>
              <Link 
                to="/eventos" 
                className="hidden md:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-3xl bg-card animate-pulse aspect-[4/5]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {events.slice(0, 8).map((event, index) => (
                  <PremiumEventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            )}

            <div className="flex justify-center mt-10 md:hidden">
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link to="/eventos">
                  Ver todos os eventos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-secondary text-secondary-foreground">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="font-display text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-secondary-foreground/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* For Organizers CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  Para Organizadores
                </span>
                <h2 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  Crie eventos extraordinários
                </h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                  A plataforma completa para vender ingressos, gerenciar participantes e criar experiências memoráveis.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                  {[
                    { icon: Ticket, label: "Venda Ilimitada" },
                    { icon: BarChart3, label: "Analytics" },
                    { icon: Shield, label: "Anti-fraude" },
                    { icon: Zap, label: "Pagamento 24h" },
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border"
                    >
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-medium">{feature.label}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="xl" className="rounded-full text-lg">
                    <Link to="/cadastro">
                      Começar grátis
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="xl" className="rounded-full text-lg">
                    <Link to="/precos">Ver preços</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-6 w-6 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="font-display text-2xl md:text-3xl font-medium mb-6 leading-relaxed">
                "A Influente revolucionou a forma como organizamos nossos eventos. 
                Simples, rápida e extremamente confiável."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent" />
                <div className="text-left">
                  <div className="font-semibold">Maria Silva</div>
                  <div className="text-sm text-muted-foreground">Produtora, Festival XYZ</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-secondary text-secondary-foreground">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
                Pronto para começar?
              </h2>
              <p className="text-xl text-secondary-foreground/70 mb-10">
                Junte-se a milhares de organizadores que confiam na Influente
              </p>
              <Button asChild size="xl" variant="hero" className="rounded-full text-lg">
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
