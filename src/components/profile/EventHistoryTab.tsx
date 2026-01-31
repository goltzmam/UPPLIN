import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Ticket, Star } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface EventWithTicket {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string | null;
  venue_name: string | null;
  ticketCount: number;
  hasReview: boolean;
}

export function EventHistoryTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["user-event-history", user?.id],
    queryFn: async () => {
      // Get all tickets with event data
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          event_id,
          events:event_id (
            id,
            slug,
            title,
            cover_image_url,
            start_at,
            end_at,
            venue_name
          )
        `)
        .eq("buyer_user_id", user!.id);

      if (ticketsError) throw ticketsError;

      // Get user reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("event_reviews")
        .select("event_id")
        .eq("user_id", user!.id);

      if (reviewsError) throw reviewsError;

      const reviewedEventIds = new Set(reviews?.map((r) => r.event_id) || []);

      // Group tickets by event and count
      const eventMap = new Map<string, EventWithTicket>();
      
      tickets?.forEach((ticket: any) => {
        if (!ticket.events) return;
        
        const eventId = ticket.events.id;
        if (eventMap.has(eventId)) {
          const existing = eventMap.get(eventId)!;
          existing.ticketCount += 1;
        } else {
          eventMap.set(eventId, {
            id: ticket.events.id,
            slug: ticket.events.slug,
            title: ticket.events.title,
            cover_image_url: ticket.events.cover_image_url,
            start_at: ticket.events.start_at,
            end_at: ticket.events.end_at,
            venue_name: ticket.events.venue_name,
            ticketCount: 1,
            hasReview: reviewedEventIds.has(eventId),
          });
        }
      });

      return Array.from(eventMap.values()).sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      );
    },
    enabled: !!user,
  });

  const upcomingEvents = events.filter((e) => isFuture(new Date(e.start_at)));
  const pastEvents = events.filter((e) => isPast(new Date(e.start_at)));

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past")}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Próximos ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Passados ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8 text-accent" />}
              title="Nenhum evento agendado"
              description="Explore novos eventos para participar"
              variant="default"
              action={
                <Button asChild className="btn-gradient">
                  <Link to="/eventos">Ver eventos</Link>
                </Button>
              }
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="upcoming" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastEvents.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8 text-accent" />}
              title="Nenhum evento passado"
              description="Seus eventos finalizados aparecerão aqui"
              variant="default"
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="past" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventCard({
  event,
  variant,
}: {
  event: EventWithTicket;
  variant: "upcoming" | "past";
}) {
  const eventDate = new Date(event.start_at);
  const isPastEvent = variant === "past";

  return (
    <Link to={`/evento/${event.slug || event.id}`}>
      <div className="flex gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
        {/* Event Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className={`w-full h-full object-cover ${isPastEvent ? "opacity-70" : ""}`}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm line-clamp-1">{event.title}</h3>
            {isPastEvent && !event.hasReview && (
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                <Star className="h-3 w-3 mr-1" />
                Avaliar
              </Badge>
            )}
            {isPastEvent && event.hasReview && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs bg-green-500/20 text-green-400">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Avaliado
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(eventDate, "EEEE, dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(eventDate, "HH:mm", { locale: ptBR })}</span>
            </div>

            {event.venue_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1">{event.venue_name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 mt-2">
            <Ticket className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">
              {event.ticketCount} ingresso{event.ticketCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
