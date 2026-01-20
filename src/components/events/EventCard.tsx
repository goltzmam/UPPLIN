import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrganizerPreviewTooltip } from "./OrganizerPreviewTooltip";

interface EventCardProps {
  id: string;
  title: string;
  coverImageUrl: string | null;
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
  title,
  coverImageUrl,
  startAt,
  venueName,
  addressText,
  minPrice = 0,
  soldOut = false,
  organizerId,
  organizerName,
  organizerUsername,
}: EventCardProps) {
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
    <div className="group block bg-card rounded-2xl lg:rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
      {/* Cover Image - Clickable */}
      <Link to={`/evento/${id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Date badge */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            <div className="bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-center shadow-lg">
              <div className="text-lg sm:text-xl font-bold leading-tight">{format(eventDate, "d")}</div>
              <div className="text-[10px] sm:text-xs uppercase text-muted-foreground font-medium">{format(eventDate, "MMM", { locale: ptBR })}</div>
            </div>
          </div>

          {/* Sold out badge */}
          {soldOut && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <Badge variant="destructive" className="shadow-lg text-xs font-semibold">Esgotado</Badge>
            </div>
          )}

          {/* Price tag on image */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs sm:text-sm font-bold ${minPrice === 0 ? "bg-success/90 text-white" : "bg-background/95 text-foreground"}`}>
              {minPrice === 0 ? "Grátis" : `R$ ${(minPrice / 100).toFixed(0)}`}
            </div>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Organizer link with hover preview - NOT inside a Link */}
        {displayUsername && organizerId && (
          <OrganizerPreviewTooltip
            organizerId={organizerId}
            organizerName={organizerName}
            organizerUsername={organizerUsername}
          />
        )}

        <Link to={`/evento/${id}`} className="block">
          <h3 className="font-display font-bold text-base sm:text-lg lg:text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-primary/60" />
            <span className="capitalize truncate">{formattedDay}, {formattedDate} • {formattedTime}</span>
          </div>
          {(venueName || addressText) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="truncate">{venueName || addressText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
