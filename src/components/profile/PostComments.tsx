import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { SafetyActions } from "@/components/safety/SafetyActions";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
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
  moderation_status?: string;
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
    queryKey: ["post-comments-count", postId, user?.id],
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

  const { data: comments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["post-comments", postId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch profiles for comments
      if (!data.length) return [];
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
      }).select("moderation_status").single();

      if (error) throw error;

      setNewComment("");
      toast.success("Comentário publicado.");
      await refreshComments();
    } catch (error) {
      toast.error((error as { code?: string })?.code === "23514" ? "Revise o texto: ele contém conteúdo que não é permitido na UPPLIN." : "Não foi possível publicar o comentário. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || deletingCommentId) return;

    setDeletingCommentId(commentId);

    try {
      const { error } = await supabase
        .from("user_post_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user!.id)
        .select("id").single();

      if (error) throw error;

      await refreshComments();
    } catch (error) {
      toast.error("Não foi possível excluir o comentário. Tente novamente.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const composer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isExpanded) return;
    const viewport = window.visualViewport;
    const fit = () => {
      const dialog = composer.current?.closest<HTMLElement>('[role="dialog"]');
      if (dialog && viewport) {
        dialog.style.height = `${Math.min(viewport.height - 16, 720)}px`;
        dialog.style.setProperty("bottom", `${Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)}px`, "important");
      }
    };
    fit(); viewport?.addEventListener("resize", fit); viewport?.addEventListener("scroll", fit);
    return () => { viewport?.removeEventListener("resize", fit); viewport?.removeEventListener("scroll", fit); };
  }, [isExpanded]);

  return (
    <div className="shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 min-w-[3.25rem] shrink-0 gap-1.5 rounded-full px-2.5 text-muted-foreground hover:text-primary sm:px-3"
        aria-label="Comentários do post"
        onClick={onToggle}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">{commentCount}</span>
      </Button>

      <Dialog open={isExpanded} onOpenChange={open => { if (open !== isExpanded) onToggle(); }}>
        <DialogContent className="!fixed !left-0 !top-auto !bottom-0 !flex h-[min(82dvh,720px)] !w-full !max-w-none !translate-x-0 !translate-y-0 !flex-col gap-0 overflow-hidden rounded-t-3xl border-b-0 p-0 sm:!left-1/2 sm:!w-[min(100%-2rem,560px)] sm:!max-w-[560px] sm:!-translate-x-1/2 sm:rounded-2xl sm:border-b">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <DialogTitle className="text-center">{commentCount} {commentCount === 1 ? "comentário" : "comentários"}</DialogTitle>
            <DialogDescription className="sr-only">Converse sobre esta publicação. Os comentários mais recentes aparecem primeiro.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5">
            {isLoading ? <div className="flex justify-center py-8"><Loader2 aria-label="Carregando comentários" className="h-5 w-5 animate-spin" /></div>
              : isError ? <div role="alert" className="space-y-2 text-center"><p>Não foi possível carregar os comentários.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div>
              : !comments.length ? <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 text-center"><MessageCircle className="h-10 w-10 text-muted-foreground/40" /><p className="font-semibold">Comece a conversa</p><p className="text-sm text-muted-foreground">Compartilhe sua opinião sobre esta publicação.</p></div>
              : comments.map(comment => <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="h-9 w-9 shrink-0"><AvatarImage src={comment.profile?.photo_url || undefined} /><AvatarFallback>{comment.profile?.full_name?.charAt(0) || "U"}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-muted-foreground">{comment.profile?.full_name || "Usuário"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{renderTextWithMentions(comment.content, handleMentionClick)}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground"><time>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</time>{comment.user_id === user?.id && <button type="button" className="min-h-8 text-muted-foreground hover:text-destructive" disabled={deletingCommentId === comment.id} onClick={() => void handleDeleteComment(comment.id)}>Excluir</button>}</div></div>
                <SafetyActions kind="comment" targetId={comment.id} userId={comment.user_id} />
              </div>)}
          </div>
          <div ref={composer} className="shrink-0 border-t border-border bg-background px-4 py-3 pb-[max(12px,var(--safe-bottom))]">
            {user ? <div className="flex items-end gap-2"><Avatar className="mb-1 h-8 w-8 shrink-0"><AvatarImage src={profile?.photo_url || undefined} /><AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><MentionInput suggestionsPosition="top" placeholder="Adicione um comentário..." value={newComment} onChange={setNewComment} disabled={isSubmitting} minHeight="44px" className="max-h-28 min-w-0 rounded-2xl border-border bg-muted/40 !text-base" onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleAddComment(); } }} /></div><Button type="button" size="icon" aria-label="Enviar comentário" className="h-11 w-11 shrink-0 rounded-full btn-gradient" disabled={!newComment.trim() || isSubmitting} onClick={() => void handleAddComment()}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
              : <p className="py-2 text-center text-sm"><Link className="text-primary underline" to="/login">Entre na sua conta</Link> para comentar.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
