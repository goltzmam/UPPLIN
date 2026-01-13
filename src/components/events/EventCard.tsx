import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}: EventCardProps) {
  const eventDate = new Date(startAt);
  const formattedDate = format(eventDate, "d 'de' MMM", { locale: ptBR });
  const formattedDay = format(eventDate, "EEEE", { locale: ptBR });
  const formattedTime = format(eventDate, "HH:mm");

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Gratuito";
    return `A partir de R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  return (
    <Link to={`/evento/${id}`} className="event-card group block bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all">
      {/* Cover Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Date badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-center shadow-lg">
            <div className="text-sm sm:text-lg font-bold leading-tight">{format(eventDate, "d")}</div>
            <div className="text-[10px] sm:text-xs uppercase text-muted-foreground">{format(eventDate, "MMM", { locale: ptBR })}</div>
          </div>
        </div>

        {/* Sold out badge */}
        {soldOut && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <Badge variant="destructive" className="shadow-lg text-xs">Esgotado</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="font-display font-bold text-sm sm:text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="capitalize truncate">{formattedDay}, {formattedDate} • {formattedTime}</span>
          </div>
          {(venueName || addressText) && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{venueName || addressText}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <span className={`font-semibold text-xs sm:text-sm ${minPrice === 0 ? "text-success" : "text-foreground"}`}>
            {formatPrice(minPrice)}
          </span>
        </div>
      </div>
    </Link>
  );
}
