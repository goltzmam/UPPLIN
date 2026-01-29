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

  // Empty state component with premium design
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
      {/* Animated icon with gradient ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-8"
      >
        {/* Outer glow ring */}
        <motion.div 
          className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-xl"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Icon container with gradient border */}
        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 p-[2px]">
          <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Users className="h-10 w-10 text-primary" />
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Title with gradient text */}
      <motion.h3 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-display text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3"
      >
        {title}
      </motion.h3>
      
      {/* Description */}
      <motion.p 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-muted-foreground text-sm mb-8 max-w-[260px] leading-relaxed"
      >
        {description}
      </motion.p>
      
      {/* Action buttons */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-3 w-full max-w-[240px]"
      >
        {showLoginButton && (
          <Button asChild size="lg" className="w-full font-semibold rounded-full h-12 text-base">
            <Link to="/login">Entrar na conta</Link>
          </Button>
        )}
        {showExploreButton && (
          <Button 
            asChild 
            size="lg"
            className="w-full font-semibold rounded-full h-12 text-base bg-primary hover:bg-primary/90"
          >
            <Link to="/explorar-organizadores" className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Descobrir Organizadores
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Featured organizers preview - only show when explore button is visible */}
      {showExploreButton && (
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 w-full max-w-xs"
        >
          <div className="flex items-center gap-2 text-muted-foreground/50 text-xs mb-4 justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <span className="uppercase tracking-wider font-medium">Organizadores populares</span>
          </div>
          
          {/* Stacked avatars with overlap effect */}
          <div className="flex justify-center -space-x-3">
            {[
              "from-orange-400 to-rose-500",
              "from-violet-400 to-purple-600",
              "from-cyan-400 to-blue-500",
              "from-emerald-400 to-green-500",
              "from-amber-400 to-orange-500",
            ].map((gradient, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08, type: "spring", stiffness: 300 }}
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${gradient} border-2 border-background shadow-lg`}
              />
            ))}
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-muted-foreground/40 mt-4"
          >
            +50 organizadores para seguir
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
