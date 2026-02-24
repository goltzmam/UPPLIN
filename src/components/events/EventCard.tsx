import { Link } from "react-router-dom";
import { Calendar, MapPin, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrganizerPreviewTooltip } from "./OrganizerPreviewTooltip";

interface EventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  coverImageUrl: string | null;
  isVideo?: boolean;
  startAt: string;
  venueName: string | null;
  addressText: string | null;
  minPrice?: number;
  soldOut?: boolean;
  category?: string | null;
  organizerId?: string;
  organizerName?: string | null;
  organizerUsername?: string | null;
}

export function EventCard({
  id,
  slug,
  title,
  coverImageUrl,
  isVideo = false,
  startAt,
  venueName,
  addressText,
  minPrice = 0,
  soldOut = false,
  organizerId,
  organizerName,
  organizerUsername,
}: EventCardProps) {
  const eventUrl = `/evento/${slug || id}`;
  const eventDate = new Date(startAt);
  const formattedDate = format(eventDate, "d 'de' MMM", { locale: ptBR });
  const formattedDay = format(eventDate, "EEEE", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Gratuito";
    return `A partir de R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const displayUsername = organizerUsername || (organizerName ? organizerName.toLowerCase().replace(/\s+/g, '') : null);

  return (
    <div className="group block bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden border border-border hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300 w-full min-w-0">
      {/* Cover Image - Clickable */}
      <Link to={eventUrl} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {coverImageUrl ? (
            isVideo ? (
              <div className="relative h-full w-full">
                <video
                  src={coverImageUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={coverImageUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            )
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Date badge */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 lg:top-4 lg:left-4">
            <div className="bg-black/80 backdrop-blur-md rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 text-center shadow-lg border border-white/10">
              <div className="text-base sm:text-lg lg:text-xl font-bold leading-tight text-white">{format(eventDate, "d")}</div>
              <div className="text-[9px] sm:text-[10px] lg:text-xs uppercase text-white/70 font-medium">{format(eventDate, "MMM", { locale: ptBR })}</div>
            </div>
          </div>

          {/* Sold out badge */}
          {soldOut && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 lg:top-4 lg:right-4">
              <Badge variant="destructive" className="shadow-lg text-[10px] sm:text-xs font-semibold">Esgotado</Badge>
            </div>
          )}

          {/* Price tag on image */}
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 lg:bottom-4 lg:right-4">
            <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl backdrop-blur-md text-[10px] sm:text-xs lg:text-sm font-bold border ${minPrice === 0 ? "bg-success/90 text-white border-success/50" : "bg-black/80 text-white border-white/10"}`}>
              {minPrice === 0 ? "Grátis" : `R$ ${(minPrice / 100).toFixed(0)}`}
            </div>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-4 lg:p-5 space-y-2 sm:space-y-3">
        {/* Organizer link with hover preview - NOT inside a Link */}
        {displayUsername && organizerId && (
          <OrganizerPreviewTooltip
            organizerId={organizerId}
            organizerName={organizerName}
            organizerUsername={organizerUsername}
          />
        )}

        <Link to={eventUrl} className="block">
          <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg leading-tight line-clamp-2 text-card-foreground group-hover:text-accent transition-colors duration-200">
            {title}
          </h3>
        </Link>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-accent/80" />
            <span className="capitalize truncate text-[11px] sm:text-sm">{formattedDay}, {formattedDate} • {formattedTime}</span>
          </div>
          {(venueName || addressText) && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-accent/80" />
              <span className="truncate text-[11px] sm:text-sm">{venueName || addressText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
