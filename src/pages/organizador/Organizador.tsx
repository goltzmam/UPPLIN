import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Instagram, Facebook, Globe, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/components/events/EventCard";
import { supabase } from "@/integrations/supabase/client";

export default function OrganizadorPublico() {
  const { id } = useParams<{ id: string }>();

  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["organizer-events-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(price_cents)`)
        .eq("organizer_id", id)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <><Header /><PageLoading /><Footer /></>;

  if (!organizer) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <EmptyState
            icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
            title="Organizador não encontrado"
            description="Este organizador não existe ou não está disponível."
            action={<Button asChild><Link to="/eventos">Ver eventos</Link></Button>}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "O";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="bg-muted/30 border-b border-border py-8 sm:py-12">
          <div className="container px-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={organizer.logo_url || undefined} />
                <AvatarFallback className="text-2xl sm:text-3xl font-bold">
                  {getInitials(organizer.display_name)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left flex-1">
                <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                  {organizer.display_name}
                </h1>
                {organizer.description && (
                  <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mb-4">
                    {organizer.description}
                  </p>
                )}

                {/* Social Links */}
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  {organizer.social_instagram && (
                    <a
                      href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {organizer.social_facebook && (
                    <a
                      href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {organizer.social_website && (
                    <a
                      href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="py-8 sm:py-12">
          <div className="container px-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-6">
              Próximos Eventos
            </h2>

            {events && events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {events.map((event) => {
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
                title="Nenhum evento no momento"
                description="Este organizador não tem eventos publicados no momento."
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
