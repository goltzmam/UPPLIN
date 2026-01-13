import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EventCard } from "@/components/events/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";

export default function Eventos() {
  const [search, setSearch] = useState("");

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

  const filteredEvents = events?.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.venue_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Search Header */}
        <section className="bg-muted/30 border-b border-border py-8">
          <div className="container">
            <h1 className="font-display text-3xl font-bold mb-6">Explorar Eventos</h1>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-8">
          <div className="container">
            {isLoading ? (
              <PageLoading />
            ) : error ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
                title="Erro ao carregar eventos"
                description="Não foi possível carregar os eventos. Tente novamente."
              />
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
                title="Nenhum evento encontrado"
                description={search ? "Tente buscar com outros termos" : "Novos eventos em breve!"}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
