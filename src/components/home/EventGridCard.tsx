import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Calendar, Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EventGridCardProps {
  id: string;
  title: string;
  coverImageUrl: string | null;
  startAt: string;
  venueName?: string | null;
  organizerName?: string;
  organizerAvatar?: string | null;
  organizerSlug?: string | null;
  minPrice: number;
  index?: number;
}

export function EventGridCard({
  id,
  title,
  coverImageUrl,
  startAt,
  venueName,
  organizerName,
  organizerAvatar,
  organizerSlug,
  minPrice,
  index = 0,
}: EventGridCardProps) {
  const formattedDate = format(new Date(startAt), "d MMM", { locale: ptBR });
  const formattedPrice = minPrice === 0 
    ? "Grátis" 
    : `R$ ${(minPrice / 100).toFixed(0)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative"
    >
      <Link to={`/evento/${id}`} className="block">
        {/* Card Container */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
          {/* Image */}
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Date Badge */}
          <div className="absolute top-3 left-3">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <div className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-sm border",
              minPrice === 0 
                ? "bg-success/20 border-success/30 text-success" 
                : "bg-black/60 border-white/10 text-white"
            )}>
              <span className="text-xs font-bold">
                {formattedPrice}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Title */}
            <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2 mb-2 group-hover:text-white/90 transition-colors">
              {title}
            </h3>

            {/* Venue */}
            {venueName && (
              <div className="flex items-center gap-1.5 text-white/70 text-sm mb-3">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{venueName}</span>
              </div>
            )}

            {/* Organizer */}
            {organizerName && (
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <Avatar className="h-6 w-6 ring-1 ring-white/20">
                  <AvatarImage src={organizerAvatar || undefined} />
                  <AvatarFallback className="bg-white/10 text-white text-[10px]">
                    {organizerName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/80 font-medium truncate">
                  {organizerName}
                </span>
              </div>
            )}
          </div>

          {/* Hover overlay with action buttons */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>
    </motion.div>
  );
}
