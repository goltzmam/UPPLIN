import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostLikeButtonProps {
  postId: string;
}

export function PostLikeButton({ postId }: PostLikeButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const { data: likeData } = useQuery({
    queryKey: ["post-likes", postId],
    queryFn: async () => {
      const { data: likes, error } = await supabase
        .from("user_post_likes")
        .select("id, user_id")
        .eq("post_id", postId);

      if (error) throw error;

      return {
        count: likes?.length || 0,
        isLiked: likes?.some((like) => like.user_id === user?.id) || false,
      };
    },
    enabled: !!postId,
  });

  const isLiked = optimisticLiked ?? likeData?.isLiked ?? false;
  const likeCount = likeData?.count ?? 0;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      if (isLiked) {
        const { error } = await supabase
          .from("user_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_post_likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: () => {
      setOptimisticLiked(!isLiked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-likes", postId] });
    },
    onError: (error) => {
      setOptimisticLiked(null);
      console.error("Erro ao curtir post:", error);
    },
    onSettled: () => {
      setOptimisticLiked(null);
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-primary",
        isLiked && "text-red-500 hover:text-red-600"
      )}
      onClick={() => toggleLike.mutate()}
      disabled={toggleLike.isPending}
    >
      <Heart
        className={cn("h-4 w-4", isLiked && "fill-current")}
      />
      <span className="text-xs">{likeCount + (optimisticLiked === true ? 1 : optimisticLiked === false ? -1 : 0)}</span>
    </Button>
  );
}
