import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Instagram, Facebook, Globe, Building2, CalendarDays, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { FollowButton } from "@/components/events/FollowButton";
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

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["organizer-events-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          cover_image_url,
          start_at,
          venue_name,
          address_text,
          ticket_types(price_cents)
        `)
        .eq("organizer_id", id)
        .eq("status", "published")
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["organizer-followers", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: eventCount = 0 } = useQuery({
    queryKey: ["organizer-event-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", id)
        .eq("status", "published");

      if (error) throw error;
      return count || 0;
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

  const memberSince = organizer.created_at 
    ? format(new Date(organizer.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="flex-1 pt-14">
        {/* Profile Header */}
        <div className="bg-gradient-to-b from-muted to-background">
          <div className="container py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={organizer.logo_url || undefined} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-accent to-pink-500 text-white">
                  {getInitials(organizer.display_name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                  {organizer.display_name}
                </h1>

                {/* Stats */}
                <div className="flex justify-center sm:justify-start gap-6 mb-4">
                  <div className="text-center">
                    <span className="font-bold text-lg">{eventCount}</span>
                    <p className="text-xs text-muted-foreground">Eventos</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg">{followerCount.toLocaleString("pt-BR")}</span>
                    <p className="text-xs text-muted-foreground">Seguidores</p>
                  </div>
                </div>

                {/* Follow Button */}
                <FollowButton organizerId={id!} size="default" />

                {/* Description */}
                {organizer.description && (
                  <p className="text-muted-foreground mt-4 max-w-lg">
                    {organizer.description}
                  </p>
                )}

                {/* Social Links */}
                <div className="flex justify-center sm:justify-start gap-3 mt-4">
                  {organizer.social_instagram && (
                    <a
                      href={organizer.social_instagram.startsWith("http") ? organizer.social_instagram : `https://instagram.com/${organizer.social_instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {organizer.social_facebook && (
                    <a
                      href={organizer.social_facebook.startsWith("http") ? organizer.social_facebook : `https://facebook.com/${organizer.social_facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {organizer.social_website && (
                    <a
                      href={organizer.social_website.startsWith("http") ? organizer.social_website : `https://${organizer.social_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>

                {/* Meta info */}
                {memberSince && (
                  <div className="flex justify-center sm:justify-start gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      <span>Desde {memberSince}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="container py-8">
          <h2 className="font-display text-xl font-bold mb-6">
            Eventos de {organizer.display_name}
          </h2>

          {loadingEvents ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="feed-card animate-pulse bg-muted" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
              {events.map((event: any, index: number) => {
                const minPrice = event.ticket_types?.length
                  ? Math.min(...event.ticket_types.map((t: any) => t.price_cents || 0))
                  : 0;

                return (
                  <FeedEventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    coverImageUrl={event.cover_image_url}
                    startAt={event.start_at}
                    venueName={event.venue_name}
                    addressText={event.address_text}
                    organizerName={organizer.display_name}
                    organizerAvatar={organizer.logo_url}
                    minPrice={minPrice}
                    index={index}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum evento"
              description="Este organizador ainda não publicou eventos."
            />
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
