import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { Users, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface EventWithOrganizer {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  venue_name: string | null;
  address_text: string | null;
  organizer: {
    display_name: string;
    logo_url: string | null;
  } | null;
  ticket_types: {
    price_cents: number | null;
  }[];
}

export function FollowingFeed() {
  const { user } = useAuth();

  const { data: followedEvents, isLoading } = useQuery({
    queryKey: ["following-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get the organizers the user follows
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("organizer_id")
        .eq("user_id", user.id);

      if (followsError) throw followsError;
      if (!follows?.length) return [];

      const organizerIds = follows.map(f => f.organizer_id);

      // Then get events from those organizers
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          cover_image_url,
          start_at,
          venue_name,
          address_text,
          organizer:organizer_accounts(display_name, logo_url),
          ticket_types(price_cents)
        `)
        .eq("status", "published")
        .in("organizer_id", organizerIds)
        .order("start_at", { ascending: true })
        .limit(20);

      if (eventsError) throw eventsError;
      return events as EventWithOrganizer[];
    },
    enabled: !!user?.id,
  });

  // Empty state component with dark theme for mobile
  const EmptyState = ({ 
    title, 
    description, 
    showLoginButton = false,
    showExploreButton = false 
  }: { 
    title: string; 
    description: string; 
    showLoginButton?: boolean;
    showExploreButton?: boolean;
  }) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-pink-500/30 rounded-full blur-2xl scale-150" />
        <div className="relative h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Users className="h-10 w-10 text-white/80" />
        </div>
      </motion.div>
      
      <motion.h3 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="font-display text-xl font-bold text-white mb-2"
      >
        {title}
      </motion.h3>
      
      <motion.p 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/60 text-sm mb-6 max-w-[280px]"
      >
        {description}
      </motion.p>
      
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 w-full max-w-[200px]"
      >
        {showLoginButton && (
          <Button asChild className="w-full bg-white text-black hover:bg-white/90">
            <Link to="/login">Entrar</Link>
          </Button>
        )}
        {showExploreButton && (
          <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
            <Link to="/explorar-organizadores" className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Explorar Organizadores
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Suggested organizers preview */}
      {showExploreButton && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 w-full"
        >
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3 justify-center">
            <Sparkles className="h-3 w-3" />
            <span>Organizadores em destaque</span>
          </div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10"
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  if (!user) {
    return (
      <EmptyState
        title="Siga organizadores"
        description="Faça login para seguir organizadores e ver eventos personalizados para você"
        showLoginButton
        showExploreButton
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-white/10 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!followedEvents?.length) {
    return (
      <EmptyState
        title="Nenhum evento ainda"
        description="Siga organizadores para ver seus eventos aqui"
        showExploreButton
      />
    );
  }

  return (
    <div className="space-y-4 px-4 pb-4">
      {followedEvents.map((event, index) => {
        const minPrice = event.ticket_types?.length
          ? Math.min(...event.ticket_types.map(t => t.price_cents || 0))
          : 0;

        return (
          <FeedEventCard
            key={event.id}
            id={event.id}
            title={event.title}
            coverImageUrl={event.cover_image_url}
            startAt={event.start_at}
            venueName={event.venue_name}
            addressText={event.address_text}
            organizerName={event.organizer?.display_name}
            organizerAvatar={event.organizer?.logo_url}
            minPrice={minPrice}
            index={index}
          />
        );
      })}
    </div>
  );
}
