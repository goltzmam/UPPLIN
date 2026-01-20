import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  venue_name?: string | null;
}

interface EventGridProps {
  events: Event[];
}

export function EventGrid({ events }: EventGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          <Link
            to={`/evento/${event.id}`}
            className="block relative aspect-square overflow-hidden rounded-sm sm:rounded-lg group"
          >
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/30" />
            )}
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-center text-white p-2">
                <p className="text-xs sm:text-sm font-medium line-clamp-2">{event.title}</p>
                <p className="text-[10px] sm:text-xs text-white/80 mt-1">
                  {format(new Date(event.start_at), "d MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
