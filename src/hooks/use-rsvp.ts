import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface UseRsvpOptions {
  eventId: string;
}

export function useRsvp({ eventId }: UseRsvpOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user has RSVP'd
  const { data: userRsvp, isLoading: isLoadingUserRsvp } = useQuery({
    queryKey: ["rsvp", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!eventId,
  });

  // Get RSVP count for event
  const { data: rsvpCount = 0, isLoading: isLoadingCount } = useQuery({
    queryKey: ["rsvp-count", eventId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "going");
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
  });

  // Get list of people going (with their profiles)
  const { data: peopleGoing = [], isLoading: isLoadingPeople } = useQuery({
    queryKey: ["rsvp-people", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_rsvps")
        .select(`
          id,
          user_id,
          status,
          is_public,
          created_at
        `)
        .eq("event_id", eventId)
        .eq("status", "going")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });

  // RSVP mutation (toggle)
  const rsvpMutation = useMutation({
    mutationFn: async (status: "going" | "interested" | "not_going") => {
      if (!user) throw new Error("Você precisa estar logado");

      // If already RSVP'd with same status, remove it
      if (userRsvp && userRsvp.status === status) {
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("id", userRsvp.id);
        
        if (error) throw error;
        return null;
      }

      // Upsert RSVP
      const { data, error } = await supabase
        .from("event_rsvps")
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
          is_public: true,
        }, {
          onConflict: "event_id,user_id",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rsvp", eventId] });
      queryClient.invalidateQueries({ queryKey: ["rsvp-count", eventId] });
      queryClient.invalidateQueries({ queryKey: ["rsvp-people", eventId] });
      
      if (data) {
        toast.success("Você confirmou presença! 🎉");
      } else {
        toast.success("RSVP removido");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao confirmar presença");
    },
  });

  return {
    userRsvp,
    isGoing: userRsvp?.status === "going",
    isInterested: userRsvp?.status === "interested",
    rsvpCount,
    peopleGoing,
    isLoading: isLoadingUserRsvp || isLoadingCount || isLoadingPeople,
    toggleRsvp: (status: "going" | "interested" | "not_going" = "going") => 
      rsvpMutation.mutate(status),
    isSubmitting: rsvpMutation.isPending,
  };
}
