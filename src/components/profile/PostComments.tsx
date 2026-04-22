import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MentionInput, renderTextWithMentions } from "@/components/ui/mention-input";
import { invalidateSocialQueries } from "@/lib/social-posts";

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    photo_url: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PostComments({ postId, isExpanded, onToggle }: PostCommentsProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const handleMentionClick = (slug: string) => {
    navigate(`/o/${slug}`);
  };

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["post-comments-count", postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_post_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!postId,
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for comments
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id),
      })) as PostComment[];
    },
    enabled: isExpanded,
  });

  const refreshComments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] }),
      queryClient.invalidateQueries({ queryKey: ["post-comments-count", postId] }),
      invalidateSocialQueries(queryClient, user?.id),
    ]);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("user_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      await refreshComments();
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;

    setDeletingCommentId(commentId);

    try {
      const { error } = await supabase
        .from("user_post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      await refreshComments();
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 min-w-[3.25rem] shrink-0 gap-1.5 rounded-full px-2.5 text-muted-foreground hover:text-primary sm:px-3"
        onClick={onToggle}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">{commentCount}</span>
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-4 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
          {/* Comments List */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Seja o primeiro a comentar!
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 group">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={comment.profile?.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {comment.profile?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <p className="text-xs font-medium">
                        {comment.profile?.full_name || "Usuário"}
                      </p>
                      <p className="text-sm break-words">
                        {renderTextWithMentions(comment.content, handleMentionClick)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          {user && (
            <div className="flex items-start gap-2 pt-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={profile?.photo_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 items-end gap-2">
                <MentionInput
                  placeholder="Escreva um comentário... Use @ para marcar"
                  value={newComment}
                  onChange={setNewComment}
                  className="min-w-0 text-sm bg-muted border-0"
                  minHeight="36px"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newComment.trim()) handleAddComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 self-end btn-gradient"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
