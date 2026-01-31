import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Heart, Bookmark, ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EventGridCardProps {
  id: string;
  slug?: string | null;
  title: string;
  coverImageUrl: string | null;
  startAt: string;
  venueName?: string | null;
  organizerName?: string;
  organizerAvatar?: string | null;
  organizerSlug?: string | null;
  organizerId?: string;
  minPrice: number;
  index?: number;
}

export function EventGridCard({
  id,
  slug,
  title,
  coverImageUrl,
  startAt,
  venueName,
  organizerName,
  organizerAvatar,
  organizerSlug,
  organizerId,
  minPrice,
  index = 0,
}: EventGridCardProps) {
  const eventUrl = `/evento/${slug || id}`;
  const formattedDate = format(new Date(startAt), "d MMM", { locale: ptBR });
  const formattedDay = format(new Date(startAt), "EEEE", { locale: ptBR });
  const formattedTime = format(new Date(startAt), "HH:mm", { locale: ptBR });
  const formattedPrice = minPrice === 0 
    ? "Grátis" 
    : `R$ ${(minPrice / 100).toFixed(0)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: "easeOut" }}
      className="group relative"
    >
      <Link to={eventUrl} className="block">
        {/* Card Container with dark theme */}
        <div className="relative aspect-[3/4] rounded-2xl lg:rounded-3xl overflow-hidden bg-card border border-border hover:border-accent/30 shadow-md hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500">
          {/* Image with parallax effect on hover */}
          <motion.div 
            className="absolute inset-0"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted/50" />
            )}
          </motion.div>

          {/* Gradient overlay - intensifies on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 group-hover:from-black/100 group-hover:via-black/50 transition-all duration-500" />

          {/* Shine/shimmer effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </div>

          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent" />
          </div>

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
            {/* Date Badge */}
            <motion.div className="overflow-hidden">
              <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 group-hover:bg-black/90 group-hover:border-primary/30 transition-colors">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  {formattedDate}
                </span>
                {/* Reveal day on hover */}
                <motion.span 
                  className="block text-[10px] text-white/70 capitalize overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  whileHover={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {formattedDay}
                </motion.span>
              </div>
            </motion.div>

            {/* Price Badge */}
            <div className={cn(
              "px-3 py-1.5 rounded-xl backdrop-blur-md border transition-all duration-300",
              minPrice === 0 
                ? "bg-success/30 border-success/40 text-success group-hover:bg-success/50 group-hover:border-success/60" 
                : "bg-black/70 border-white/10 text-white group-hover:bg-black/90 group-hover:border-primary/30"
            )}>
              <span className="text-xs font-bold">
                {formattedPrice}
              </span>
            </div>
          </div>

          {/* Content area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            {/* Extra info revealed on hover */}
            <motion.div
              className="overflow-hidden mb-2"
              initial={{ height: 0, opacity: 0 }}
              whileHover={{ height: "auto", opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <span className="uppercase tracking-wider">{formattedTime}</span>
                {venueName && (
                  <>
                    <span>•</span>
                    <span className="truncate">{venueName}</span>
                  </>
                )}
              </div>
            </motion.div>

            {/* Title */}
            <h3 className="font-display text-base lg:text-lg xl:text-xl font-bold text-card-foreground leading-tight line-clamp-2 mb-2 group-hover:text-accent transition-colors">
              {title}
            </h3>

            {/* Venue - visible by default */}
            {venueName && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-3 group-hover:text-card-foreground/80 transition-colors">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{venueName}</span>
              </div>
            )}

            {/* Organizer with @ handle */}
            {organizerName && (
              <div className="flex items-center justify-between pt-3 border-t border-border group-hover:border-accent/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 ring-2 ring-border group-hover:ring-accent/40 transition-all">
                    <AvatarImage src={organizerAvatar || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                      {organizerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-xs text-card-foreground font-medium truncate block">
                      {organizerName}
                    </span>
                    {organizerSlug && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        @{organizerSlug}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover action button */}
                <motion.div
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ scale: 0.8 }}
                  whileHover={{ scale: 1 }}
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-card-foreground" />
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Interactive border glow on hover */}
          <div className="absolute inset-0 rounded-2xl lg:rounded-3xl ring-1 ring-white/0 group-hover:ring-accent/30 transition-all duration-500 pointer-events-none" />
        </div>
      </Link>
    </motion.div>
  );
}
