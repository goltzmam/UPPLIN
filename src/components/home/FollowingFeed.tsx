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
  slug: string | null;
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

  const { data: followedEvents, isLoading, refetch } = useQuery({
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
          slug,
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
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter to pick up new follows quickly
    refetchOnMount: true,
  });

  // Empty state component with high-conversion design
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
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-6"
      >
        {/* Glow effect - gradient */}
        <motion.div 
          className="absolute -inset-3 rounded-full blur-2xl"
          style={{ background: "linear-gradient(135deg, rgba(255, 106, 0, 0.3), rgba(255, 45, 45, 0.3), rgba(255, 0, 122, 0.3))" }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Icon container with gradient border */}
        <div 
          className="relative h-20 w-20 rounded-full flex items-center justify-center"
          style={{ 
            background: "linear-gradient(135deg, rgba(255, 106, 0, 0.1), rgba(255, 0, 122, 0.1))",
            border: "1px solid rgba(255, 45, 45, 0.2)"
          }}
        >
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Users className="h-9 w-9" style={{ color: '#FF2D2D' }} />
          </motion.div>
        </div>
      </motion.div>
      
      {/* Title - high contrast */}
      <motion.h3 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-display text-xl font-bold text-foreground mb-2"
      >
        {title}
      </motion.h3>
      
      {/* Description - readable contrast */}
      <motion.p 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-muted-foreground text-sm mb-8 max-w-[280px] leading-relaxed"
      >
        {description}
      </motion.p>
      
      {/* CTA Buttons - high conversion */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-3 w-full max-w-[260px]"
      >
        {showLoginButton && (
          <Button asChild size="lg" className="w-full font-semibold rounded-full h-12 text-base shadow-lg">
            <Link to="/login">Entrar na conta</Link>
          </Button>
        )}
        {showExploreButton && (
          <Button 
            asChild 
            size="lg"
            className="w-full font-semibold rounded-full h-12 text-base shadow-lg"
          >
            <Link to="/explorar-organizadores" className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Descobrir Organizadores
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Social proof section */}
      {showExploreButton && (
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 w-full max-w-xs"
        >
          {/* Stacked avatars */}
          <div className="flex justify-center -space-x-2 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.06, type: "spring", stiffness: 300 }}
                className="h-10 w-10 rounded-full bg-muted border-2 border-background"
              />
            ))}
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-xs text-muted-foreground"
          >
            <span className="text-foreground font-medium">+50 organizadores</span> esperando você
          </motion.p>
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
          <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />
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
            slug={event.slug}
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
