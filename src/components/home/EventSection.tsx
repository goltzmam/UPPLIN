import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";

interface Event {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  venue_name: string | null;
  address_text: string | null;
}

interface EventSectionProps {
  title: string;
  subtitle?: string;
  events: Event[];
  viewAllLink?: string;
  loading?: boolean;
}

function EventCardSkeleton() {
  return (
    <div className="event-card animate-pulse">
      <div className="aspect-[16/9] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
        <div className="pt-2 border-t border-border">
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function EventSection({
  title,
  subtitle,
  events,
  viewAllLink = "/eventos",
  loading = false,
}: EventSectionProps) {
  if (loading) {
    return (
      <section className="py-10">
        <div className="container">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="h-8 bg-muted rounded w-48 animate-pulse" />
              {subtitle && <div className="h-4 bg-muted rounded w-32 mt-2 animate-pulse" />}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-primary font-medium hover:underline group"
          >
            Ver todos
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.slice(0, 4).map((event, index) => (
            <div
              key={event.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <EventCard
                id={event.id}
                title={event.title}
                coverImageUrl={event.cover_image_url}
                startAt={event.start_at}
                venueName={event.venue_name}
                addressText={event.address_text}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
