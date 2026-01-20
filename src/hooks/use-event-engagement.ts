import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useEventEngagement(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch like status and count
  const { data: likeData } = useQuery({
    queryKey: ["event-like", eventId, user?.id],
    queryFn: async () => {
      const [{ count: likeCount }, userLike] = await Promise.all([
        supabase
          .from("event_likes")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
        user?.id
          ? supabase
              .from("event_likes")
              .select("id")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        count: likeCount || 0,
        isLiked: !!userLike?.data,
      };
    },
    staleTime: 30000,
  });

  // Fetch save status and count
  const { data: saveData } = useQuery({
    queryKey: ["event-save", eventId, user?.id],
    queryFn: async () => {
      const [{ count: saveCount }, userSave] = await Promise.all([
        supabase
          .from("saved_events")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
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
        count: saveCount || 0,
        isSaved: !!userSave?.data,
      };
    },
    staleTime: 30000,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("Faça login para curtir eventos");
      }

      if (likeData?.isLiked) {
        // Unlike
        const { error } = await supabase
          .from("event_likes")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
        return { action: "unliked" };
      } else {
        // Like
        const { error } = await supabase
          .from("event_likes")
          .insert({ event_id: eventId, user_id: user.id });
        if (error) throw error;
        return { action: "liked" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-like", eventId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("Faça login para salvar eventos");
      }

      if (saveData?.isSaved) {
        // Unsave
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
        return { action: "unsaved" };
      } else {
        // Save
        const { error } = await supabase
          .from("saved_events")
          .insert({ event_id: eventId, user_id: user.id });
        if (error) throw error;
        return { action: "saved" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-save", eventId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleLike = useCallback(() => {
    if (!user) {
      toast.error("Faça login para curtir eventos");
      return;
    }
    likeMutation.mutate();
  }, [user, likeMutation]);

  const toggleSave = useCallback(() => {
    if (!user) {
      toast.error("Faça login para salvar eventos");
      return;
    }
    saveMutation.mutate();
  }, [user, saveMutation]);

  return {
    isLiked: likeData?.isLiked ?? false,
    likeCount: likeData?.count ?? 0,
    isSaved: saveData?.isSaved ?? false,
    saveCount: saveData?.count ?? 0,
    toggleLike,
    toggleSave,
    isLikeLoading: likeMutation.isPending,
    isSaveLoading: saveMutation.isPending,
  };
}
