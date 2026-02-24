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
import { CategoryPillsSlider } from "@/components/events/CategoryPillsSlider";

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
          slug,
          ticket_types(price_cents),
          organizer:organizer_id(id, display_name, slug),
          event_media(url, type, sort_order)
        `)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - events list doesn't need real-time updates
    gcTime: 1000 * 60 * 30,
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
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <TikTokDesktopSidebar />

      {/* Main Content - offset for fixed sidebar on desktop */}
      <main className="min-w-0 pb-24 lg:pb-8 lg:ml-[72px]">
        {/* Search Header */}
        <section className="bg-gradient-to-b from-muted/60 to-transparent border-b border-border py-4 sm:py-6 lg:py-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
            <h1 className="font-display text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2 text-foreground">
              Explorar Eventos
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-5">
              Encontre experiências incríveis perto de você
            </p>
            
            {/* Search bar */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  className="pl-9 sm:pl-11 h-10 sm:h-11 text-sm rounded-xl bg-muted/60 border-border focus:border-foreground text-foreground placeholder:text-muted-foreground w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 sm:h-11 w-10 sm:w-11 shrink-0 relative rounded-xl border-border bg-muted/60 hover:bg-muted text-foreground"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Filtre os eventos por categoria</SheetDescription>
                  </SheetHeader>
                  <div className="py-4 sm:py-6 space-y-4">
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

            {/* Category Pills - Draggable Scroll */}
            <div className="mt-4 -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-hidden">
              <CategoryPillsSlider
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Filtros:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Busca: {search.length > 15 ? search.slice(0, 15) + "..." : search}
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
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="w-full max-w-6xl mx-auto px-3 sm:px-4">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl sm:rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-accent" />}
                title="Erro ao carregar eventos"
                description="Não foi possível carregar os eventos. Tente novamente."
                variant="default"
              />
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                  {filteredEvents.length} evento(s) encontrado(s)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {filteredEvents.map((event: any) => {
                    const minPrice = event.ticket_types?.length
                      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
                      : 0;
                    // Fallback: use first event_media if no cover_image_url
                    const firstImage = event.event_media?.find((m: any) => m.type === "image");
                    const firstVideo = event.event_media?.find((m: any) => m.type === "video");
                    const coverUrl = event.cover_image_url || firstImage?.url || firstVideo?.url || null;
                    const isCoverVideo = !event.cover_image_url && !firstImage?.url && !!firstVideo?.url;
                      return (
                        <EventCard
                          key={event.id}
                          id={event.id}
                          slug={event.slug}
                          title={event.title}
                          coverImageUrl={coverUrl}
                          isVideo={isCoverVideo}
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
                icon={<Calendar className="h-8 w-8 text-accent" />}
                title="Nenhum evento encontrado"
                description={hasActiveFilters ? "Tente outros filtros ou busca" : "Novos eventos em breve!"}
                variant="default"
                action={hasActiveFilters ? (
                  <Button onClick={clearFilters} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Limpar filtros
                  </Button>
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
