import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SearchBar } from "@/components/home/SearchBar";
import { CategoryPills } from "@/components/home/CategoryPills";
import { EventSection } from "@/components/home/EventSection";
import { CitySelector } from "@/components/home/CitySelector";
import { TrendingBanner } from "@/components/home/TrendingBanner";
import { OrganizerCTA } from "@/components/home/OrganizerCTA";
import { FAQ } from "@/components/home/FAQ";

export default function Index() {
  // Fetch featured/published events
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

  // Split events into categories for display
  const upcomingEvents = events.slice(0, 4);
  const trendingEvents = events.slice(0, 4); // In real app, would be based on sales/views
  const weekendEvents = events.filter((e) => {
    const date = new Date(e.start_at);
    const day = date.getDay();
    return day === 0 || day === 6;
  }).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Carousel */}
        <HeroCarousel />

        {/* Search Bar */}
        <SearchBar />

        {/* Category Pills */}
        <CategoryPills />

        {/* Trending Events */}
        <EventSection
          title="🔥 Eventos mais buscados"
          subtitle="Nas últimas 24 horas"
          events={trendingEvents}
          loading={isLoading}
          viewAllLink="/eventos?ordem=popular"
        />

        {/* City Selector */}
        <CitySelector />

        {/* Trending Banner */}
        <TrendingBanner />

        {/* This Weekend */}
        <EventSection
          title="🎉 Neste fim de semana"
          events={weekendEvents.length > 0 ? weekendEvents : upcomingEvents}
          loading={isLoading}
          viewAllLink="/eventos?quando=fim-de-semana"
        />

        {/* Upcoming Events */}
        <EventSection
          title="📅 Próximos eventos"
          events={upcomingEvents}
          loading={isLoading}
        />

        {/* Organizer CTA */}
        <OrganizerCTA />

        {/* FAQ */}
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
