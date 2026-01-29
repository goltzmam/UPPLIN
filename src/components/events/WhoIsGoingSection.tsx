import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRsvp } from "@/hooks/use-rsvp";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/hooks/use-haptic";

interface WhoIsGoingSectionProps {
  eventId: string;
}

export function WhoIsGoingSection({ eventId }: WhoIsGoingSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isGoing, rsvpCount, peopleGoing, toggleRsvp, isSubmitting } = useRsvp({ eventId });

  // Fetch profiles for the people going
  const { data: profiles = [] } = useQuery({
    queryKey: ["rsvp-profiles", eventId, peopleGoing],
    queryFn: async () => {
      if (peopleGoing.length === 0) return [];
      const userIds = peopleGoing.map((r) => r.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", userIds);
      
      if (error) return [];
      return data || [];
    },
    enabled: peopleGoing.length > 0,
  });

  const handleRsvp = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    triggerHaptic("selection");
    toggleRsvp("going");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-upplin)" }}
            >
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Quem vai</h3>
              <p className="text-sm text-muted-foreground">
                {rsvpCount} {rsvpCount === 1 ? "pessoa confirmada" : "pessoas confirmadas"}
              </p>
            </div>
          </div>
          
          <motion.div
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleRsvp}
              disabled={isSubmitting}
              className={`rounded-full px-6 h-10 font-semibold transition-all ${
                isGoing 
                  ? "bg-card border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00]/10" 
                  : "btn-neon"
              }`}
              style={!isGoing ? { background: "var(--gradient-upplin)" } : {}}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                />
              ) : isGoing ? (
                "✓ Vou"
              ) : (
                "Eu vou!"
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* People going */}
      <AnimatePresence>
        {profiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                {profiles.slice(0, 10).map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-border">
                      <AvatarImage src={profile.photo_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs font-semibold">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                      {profile.full_name?.split(" ")[0] || "Anônimo"}
                    </span>
                  </motion.div>
                ))}
                
                {rsvpCount > 10 && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        +{rsvpCount - 10}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">mais</span>
                  </div>
                )}
              </div>
            </div>
            
            {rsvpCount > 5 && (
              <button className="w-full py-3 border-t border-border flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {profiles.length === 0 && rsvpCount === 0 && (
        <div className="px-6 pb-6">
          <p className="text-sm text-muted-foreground">
            Seja o primeiro a confirmar presença!
          </p>
        </div>
      )}
    </div>
  );
}
