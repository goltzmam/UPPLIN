import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/events/FollowButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface OrganizerPreviewTooltipProps {
  organizerId: string;
  organizerName?: string | null;
  organizerUsername?: string | null;
  children?: React.ReactNode;
}

export function OrganizerPreviewTooltip({
  organizerId,
  organizerName,
  organizerUsername,
  children,
}: OrganizerPreviewTooltipProps) {
  const displayUsername = organizerUsername || (organizerName ? organizerName.toLowerCase().replace(/\s+/g, '') : 'organizador');

  // Fetch organizer details on hover
  const { data: organizer } = useQuery({
    queryKey: ["organizer-preview", organizerId],
    queryFn: async () => {
      // Get organizer info
      const { data: orgData, error: orgError } = await supabase
        .from("organizer_accounts")
        .select("id, display_name, logo_url, description")
        .eq("id", organizerId)
        .single();

      if (orgError) throw orgError;

      // Get follower count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId);

      // Get event count
      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId)
        .eq("status", "published");

      return {
        ...orgData,
        followersCount: followersCount || 0,
        eventsCount: eventsCount || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!organizerId,
  });

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <Link
            to={`/organizador/${organizerId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center text-xs text-white/50 hover:text-accent transition-colors"
          >
            @{displayUsername}
          </Link>
        )}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-72 p-0 overflow-hidden border-white/20 shadow-xl bg-black/95 backdrop-blur-xl z-50"
        side="top"
        align="start"
        sideOffset={8}
        asChild
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            mass: 0.8
          }}
        >
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300 }}
              >
                <Avatar className="h-12 w-12 border-2 border-white/20">
                  <AvatarImage src={organizer?.logo_url || undefined} alt={organizer?.display_name} />
                  <AvatarFallback className="bg-accent/20 text-accent font-bold">
                    {(organizer?.display_name || organizerName || "O")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.h4 
                  className="font-semibold text-sm truncate text-white"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  {organizer?.display_name || organizerName}
                </motion.h4>
                <motion.p 
                  className="text-xs text-white/60"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  @{displayUsername}
                </motion.p>
              </div>
            </div>

            {/* Description */}
            {organizer?.description && (
              <motion.p 
                className="text-xs text-white/60 line-clamp-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                {organizer.description}
              </motion.p>
            )}

            {/* Stats */}
            <motion.div 
              className="flex items-center gap-4 text-xs text-white/50"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium text-white">{organizer?.followersCount || 0}</span>
                <span>seguidores</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium text-white">{organizer?.eventsCount || 0}</span>
                <span>eventos</span>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
            >
              <div onClick={(e) => e.stopPropagation()} className="flex-1">
                <FollowButton organizerId={organizerId} size="sm" className="w-full text-xs h-8" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-white/20 text-white hover:bg-accent hover:text-white hover:border-accent transition-colors"
                asChild
              >
                <Link to={`/organizador/${organizerId}`} onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </HoverCardContent>
    </HoverCard>
  );
}