import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { EventCard } from "@/components/events/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  { id: "all", label: "Todos", icon: "🎉" },
  { id: "festa", label: "Festas", icon: "🎊" },
  { id: "show", label: "Shows", icon: "🎸" },
  { id: "teatro", label: "Teatro", icon: "🎭" },
  { id: "workshop", label: "Workshops", icon: "📚" },
  { id: "esporte", label: "Esportes", icon: "⚽" },
  { id: "gastronomia", label: "Gastronomia", icon: "🍽️" },
  { id: "tecnologia", label: "Tecnologia", icon: "💻" },
  { id: "arte", label: "Arte", icon: "🎨" },
  { id: "negocios", label: "Negócios", icon: "💼" },
];

export default function Eventos() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          ticket_types(price_cents),
          organizer:organizer_id(id, display_name, slug)
        `)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredEvents = events?.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "all" || 
      event.category?.toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = search || selectedCategory !== "all";

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* Desktop Sidebar */}
      <TikTokDesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {/* Search Header */}
        <section className="bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 py-6 sm:py-8 pt-8 sm:pt-10">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-white">Explorar Eventos</h1>
            <p className="text-white/60 text-sm mb-5">Encontre experiências incríveis perto de você</p>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Buscar eventos, artistas, locais..."
                  className="pl-11 h-11 text-sm rounded-xl bg-white/10 border-white/20 focus:border-white text-white placeholder:text-white/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 relative rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white">
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Filtre os eventos por categoria</SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoria</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setShowFilters(false);
                            }}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedCategory === cat.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <Button variant="outline" className="w-full" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-white text-black shadow-lg"
                      : "bg-white/10 border border-white/20 hover:bg-white/20 text-white"
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-white/50">Filtros:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Busca: {search}
                    <button onClick={() => setSearch("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                    <button onClick={() => setSelectedCategory("all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-6 sm:py-8">
          <div className="max-w-6xl mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-white/10 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-white/50" />}
                title="Erro ao carregar eventos"
                description="Não foi possível carregar os eventos. Tente novamente."
              />
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <>
                <p className="text-xs text-white/50 mb-4">
                  {filteredEvents.length} evento(s) encontrado(s)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredEvents.map((event: any) => {
                    const minPrice = event.ticket_types?.length
                      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
                      : 0;
                    return (
                      <EventCard
                        key={event.id}
                        id={event.id}
                        title={event.title}
                        coverImageUrl={event.cover_image_url}
                        startAt={event.start_at}
                        venueName={event.venue_name}
                        addressText={event.address_text}
                        minPrice={minPrice}
                        category={event.category}
                        organizerId={event.organizer?.id}
                        organizerName={event.organizer?.display_name}
                        organizerUsername={event.organizer?.slug}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-white/50" />}
                title="Nenhum evento encontrado"
                description={hasActiveFilters ? "Tente outros filtros ou busca" : "Novos eventos em breve!"}
                action={hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} className="border-white/20 hover:bg-white/10">Limpar filtros</Button>
                ) : undefined}
              />
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
