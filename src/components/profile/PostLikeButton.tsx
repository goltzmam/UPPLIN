import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateSocialQueries } from "@/lib/social-posts";

interface PostLikeButtonProps {
  postId: string;
}

export function PostLikeButton({ postId }: PostLikeButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isLiked = likeData?.isLiked ?? false;
  const likeCount = likeData?.count ?? 0;

  const handleToggleLike = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);

    try {
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post-likes", postId] }),
        invalidateSocialQueries(queryClient, user.id),
      ]);
    } catch (error) {
      console.error("Erro ao curtir post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-primary",
        isLiked && "text-red-500 hover:text-red-600"
      )}
      onClick={handleToggleLike}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      )}
      <span className="text-xs">{likeCount}</span>
    </Button>
  );
}
