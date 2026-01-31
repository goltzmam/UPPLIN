import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [newComment, setNewComment] = useState("");

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
        .from("profiles")
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

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !newComment.trim()) return;

      const { error } = await supabase.from("user_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      setNewComment("");
      toast.success("Comentário adicionado!");
    },
    onError: () => {
      toast.error("Erro ao adicionar comentário");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("user_post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      toast.success("Comentário excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir comentário");
    },
  });

  const commentCount = comments.length;

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-primary"
        onClick={onToggle}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">{commentCount}</span>
      </Button>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-border">
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
                      <p className="text-sm break-words">{comment.content}</p>
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
                          onClick={() => deleteComment.mutate(comment.id)}
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
            <div className="flex gap-2 pt-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={profile?.photo_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[36px] h-9 py-2 text-sm resize-none bg-muted border-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newComment.trim()) addComment.mutate();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 btn-gradient"
                  onClick={() => addComment.mutate()}
                  disabled={!newComment.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
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
