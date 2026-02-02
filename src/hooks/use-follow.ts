import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useFollow(organizerId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["follow-status", organizerId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("organizer_id", organizerId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!organizerId,
  });

  const { data: followerCount } = useQuery({
    queryKey: ["follower-count", organizerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizerId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("follows")
        .insert({ user_id: user.id, organizer_id: organizerId });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["follow-status", organizerId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", organizerId] });
      queryClient.invalidateQueries({ queryKey: ["following-events"] });
      queryClient.invalidateQueries({ queryKey: ["user-following"] });
    },
    onError: (error) => {
      console.error("Erro ao seguir organizador:", error);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", user.id)
        .eq("organizer_id", organizerId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["follow-status", organizerId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", organizerId] });
      queryClient.invalidateQueries({ queryKey: ["following-events"] });
      queryClient.invalidateQueries({ queryKey: ["user-following"] });
    },
    onError: (error) => {
      console.error("Erro ao deixar de seguir:", error);
    },
  });

  const toggleFollow = () => {
    if (!user) {
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return {
    isFollowing: isFollowing || false,
    isLoading: isLoading || followMutation.isPending || unfollowMutation.isPending,
    followerCount: followerCount || 0,
    toggleFollow,
  };
}
