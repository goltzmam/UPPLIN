import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Heart, Bookmark, ExternalLink, Users } from "lucide-react";
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
  organizerId?: string;
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
  organizerId,
  minPrice,
  index = 0,
}: EventGridCardProps) {
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
      <Link to={`/evento/${id}`} className="block">
        {/* Card Container with sophisticated hover */}
        <div className="relative aspect-[3/4] rounded-2xl lg:rounded-3xl overflow-hidden bg-muted shadow-md hover:shadow-2xl transition-all duration-500">
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
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
            )}
          </motion.div>

          {/* Gradient overlay - intensifies on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 group-hover:from-black/100 group-hover:via-black/50 transition-all duration-500" />

          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
          </div>

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
            {/* Date Badge with hover reveal */}
            <motion.div 
              className="overflow-hidden"
              initial={false}
            >
              <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 group-hover:bg-black/80 transition-colors">
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
                ? "bg-success/30 border-success/40 text-success group-hover:bg-success/50" 
                : "bg-black/60 border-white/10 text-white group-hover:bg-black/80"
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
            <h3 className="font-display text-base lg:text-lg xl:text-xl font-bold text-white leading-tight line-clamp-2 mb-2 group-hover:text-white transition-colors">
              {title}
            </h3>

            {/* Venue - visible by default */}
            {venueName && (
              <div className="flex items-center gap-1.5 text-white/70 text-sm mb-3 group-hover:text-white/90 transition-colors">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{venueName}</span>
              </div>
            )}

            {/* Organizer with @ handle */}
            {organizerName && (
              <div className="flex items-center justify-between pt-3 border-t border-white/10 group-hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                    <AvatarImage src={organizerAvatar || undefined} />
                    <AvatarFallback className="bg-white/20 text-white text-[10px] font-medium">
                      {organizerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-xs text-white font-medium truncate block">
                      {organizerName}
                    </span>
                    {organizerSlug && (
                      <span className="text-[10px] text-white/50 truncate block">
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
                  <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-white" />
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Interactive border glow on hover */}
          <div className="absolute inset-0 rounded-2xl lg:rounded-3xl ring-1 ring-white/0 group-hover:ring-white/20 transition-all duration-500 pointer-events-none" />
        </div>
      </Link>
    </motion.div>
  );
}
