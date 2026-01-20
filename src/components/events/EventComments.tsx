import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Heart, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventCommentsProps {
  eventId: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  profile?: {
    full_name: string | null;
    photo_url: string | null;
  };
}

export function EventComments({ eventId }: EventCommentsProps) {
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["event-comments", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all users
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id),
      })) as Comment[];
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from("event_comments").insert({
        event_id: eventId,
        user_id: user!.id,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      setContent("");
      setReplyTo(null);
      toast({ title: "Comentário adicionado!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar comentário", variant: "destructive" });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("event_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      toast({ title: "Comentário excluído" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!user) {
      toast({ title: "Faça login para comentar", variant: "destructive" });
      return;
    }
    addComment.mutate({ content: content.trim(), parentId: replyTo || undefined });
  };

  const parentComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">Comentários ({comments.length})</h3>
      </div>

      {/* Add comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-foreground text-background text-xs">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Respondendo a um comentário</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-primary hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <Textarea
                placeholder="Escreva um comentário..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || addComment.isPending}
              className="rounded-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Faça login para comentar
        </p>
      )}

      {/* Comments list */}
      <div className="space-y-4 mt-6">
        <AnimatePresence>
          {parentComments.map((comment) => {
            const replies = getReplies(comment.id);
            const hasReplies = replies.length > 0;
            const isExpanded = expandedReplies.has(comment.id);

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Parent comment */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.profile?.photo_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(comment.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-sm">
                          {comment.profile?.full_name || "Usuário"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {user?.id === comment.user_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => deleteComment.mutate(comment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => setReplyTo(comment.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Responder
                      </button>
                      {hasReplies && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {isExpanded ? "Ocultar" : `Ver ${replies.length}`} resposta
                          {replies.length > 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                <AnimatePresence>
                  {isExpanded && hasReplies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-11 space-y-3 border-l-2 border-muted pl-4"
                    >
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={reply.profile?.photo_url || undefined} />
                            <AvatarFallback className="bg-muted text-xs">
                              {getInitials(reply.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-medium text-sm">
                                  {reply.profile?.full_name || "Usuário"}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {formatDistanceToNow(new Date(reply.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                              {user?.id === reply.user_id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => deleteComment.mutate(reply.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando comentários...
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs">Seja o primeiro a comentar!</p>
          </div>
        )}
      </div>
    </div>
  );
}
