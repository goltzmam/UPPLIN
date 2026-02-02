import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Optimized event engagement hook with batched queries and longer cache times.
 * Designed to minimize network requests in feed scenarios.
 */
export function useEventEngagement(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Combined query for both like and save data - reduces 4 queries to 2
  const { data: engagementData } = useQuery({
    queryKey: ["event-engagement", eventId, user?.id],
    queryFn: async () => {
      // Batch all queries together
      const queries = await Promise.all([
        // Like count
        supabase
          .from("event_likes")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
        // Save count  
        supabase
          .from("saved_events")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
        // User like status
        user?.id
          ? supabase
              .from("event_likes")
              .select("id")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // User save status
        user?.id
          ? supabase
              .from("saved_events")
              .select("id")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        likeCount: queries[0].count || 0,
        saveCount: queries[1].count || 0,
        isLiked: !!queries[2]?.data,
        isSaved: !!queries[3]?.data,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - engagement doesn't need to be real-time
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Optimistic update helper
  const updateOptimistically = useCallback(
    (type: "like" | "save", value: boolean) => {
      queryClient.setQueryData(
        ["event-engagement", eventId, user?.id],
        (old: typeof engagementData) => {
          if (!old) return old;
          if (type === "like") {
            return {
              ...old,
              isLiked: value,
              likeCount: old.likeCount + (value ? 1 : -1),
            };
          }
          return {
            ...old,
            isSaved: value,
            saveCount: old.saveCount + (value ? 1 : -1),
          };
        }
      );
    },
    [queryClient, eventId, user?.id]
  );

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Faça login para curtir eventos");

      const isCurrentlyLiked = engagementData?.isLiked;
      
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("event_likes")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
        return { action: "unliked" };
      } else {
        const { error } = await supabase
          .from("event_likes")
          .insert({ event_id: eventId, user_id: user.id });
        if (error) throw error;
        return { action: "liked" };
      }
    },
    onMutate: async () => {
      // Optimistic update
      const isCurrentlyLiked = engagementData?.isLiked;
      updateOptimistically("like", !isCurrentlyLiked);
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["event-engagement", eventId] });
    },
  });

  // Save mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Faça login para salvar eventos");

      const isCurrentlySaved = engagementData?.isSaved;

      if (isCurrentlySaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
        return { action: "unsaved" };
      } else {
        const { error } = await supabase
          .from("saved_events")
          .insert({ event_id: eventId, user_id: user.id });
        if (error) throw error;
        return { action: "saved" };
      }
    },
    onMutate: async () => {
      const isCurrentlySaved = engagementData?.isSaved;
      updateOptimistically("save", !isCurrentlySaved);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["event-engagement", eventId] });
    },
  });

  const toggleLike = useCallback(() => {
    if (!user) {
      return;
    }
    likeMutation.mutate();
  }, [user, likeMutation]);

  const toggleSave = useCallback(() => {
    if (!user) {
      return;
    }
    saveMutation.mutate();
  }, [user, saveMutation]);

  // Memoize return values to prevent unnecessary re-renders
  return useMemo(() => ({
    isLiked: engagementData?.isLiked ?? false,
    likeCount: engagementData?.likeCount ?? 0,
    isSaved: engagementData?.isSaved ?? false,
    saveCount: engagementData?.saveCount ?? 0,
    toggleLike,
    toggleSave,
    isLikeLoading: likeMutation.isPending,
    isSaveLoading: saveMutation.isPending,
  }), [engagementData, toggleLike, toggleSave, likeMutation.isPending, saveMutation.isPending]);
}
