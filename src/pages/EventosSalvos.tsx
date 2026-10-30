import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventosSalvos() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: savedEvents = [], isLoading } = useQuery({
    queryKey: ["saved-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          created_at,
          event:event_id(
            id,
            title,
            cover_image_url,
            start_at,
            venue_name,
            address_text,
            organizer:organizer_id(display_name)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex bg-background text-foreground">
        <TikTokDesktopSidebar />
      <main className="flex-1 pb-app-bottom-safe lg:ml-[72px]">
        <div className="max-w-2xl mx-auto py-16 px-3 sm:px-4 text-center">
            <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2 text-foreground">Eventos Salvos</h1>
            <p className="text-muted-foreground mb-6">
              Faça login para ver seus eventos salvos
            </p>
            <Button onClick={() => navigate("/login")} className="rounded-full">
              Fazer Login
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <TikTokDesktopSidebar />
      
      <main className="flex-1 pb-app-bottom-safe lg:ml-[72px]">
        <div className="max-w-4xl mx-auto py-4 px-3 sm:px-4 pt-[calc(var(--safe-top)_+_1rem)]">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Eventos Salvos</h1>
              <p className="text-muted-foreground text-sm">
                {savedEvents.length} evento{savedEvents.length !== 1 ? "s" : ""} salvo{savedEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Events grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : savedEvents.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2 text-foreground">Nenhum evento salvo</h2>
              <p className="text-muted-foreground mb-6">
                Explore eventos e salve seus favoritos para acessar depois
              </p>
              <Button asChild className="rounded-full">
                <Link to="/eventos">Explorar Eventos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {savedEvents.map((saved: any, index: number) => {
                const event = saved.event;
                if (!event) return null;

                return (
                  <motion.div
                    key={saved.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={`/evento/${event.id}`}
                      className="block group"
                    >
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
                        {event.cover_image_url ? (
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        
                        {/* Saved badge */}
                        <div className="absolute top-3 right-3 bg-accent text-accent-foreground p-2 rounded-full">
                          <Bookmark className="h-4 w-4 fill-current" />
                        </div>

                        {/* Content - overlay text stays white for legibility on dark gradient */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 mb-2">
                            {event.title}
                          </h3>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-white/80 text-xs">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {format(new Date(event.start_at), "d MMM • HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            {event.venue_name && (
                              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{event.venue_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}