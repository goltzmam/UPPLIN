import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EventCard } from "@/components/events/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
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
        .select(`*, ticket_types(price_cents)`)
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
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Search Header */}
        <section className="bg-muted/30 border-b border-border py-6 sm:py-8 pt-20 sm:pt-24">
          <div className="container px-4">
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Explorar Eventos</h1>
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  className="pl-10 h-10 sm:h-11"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 relative">
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
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
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:bg-muted"
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Filtros:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1">
                    Busca: {search}
                    <button onClick={() => setSearch("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1">
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
          <div className="container px-4">
            {isLoading ? (
              <PageLoading />
            ) : error ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
                title="Erro ao carregar eventos"
                description="Não foi possível carregar os eventos. Tente novamente."
              />
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredEvents.length} evento(s) encontrado(s)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredEvents.map((event) => {
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
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
                title="Nenhum evento encontrado"
                description={hasActiveFilters ? "Tente outros filtros ou busca" : "Novos eventos em breve!"}
                action={hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                ) : undefined}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
