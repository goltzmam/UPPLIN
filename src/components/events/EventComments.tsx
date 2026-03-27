import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, MoreHorizontal, Trash2, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { triggerFeedback } from "@/lib/feedback";

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
    id: string;
    full_name: string | null;
    photo_url: string | null;
  };
}

export function EventComments({ eventId }: EventCommentsProps) {
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id),
      })) as Comment[];
    },
  });

  // Fetch users for mentions
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-for-mentions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .not("full_name", "is", null)
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  // Filter mentions based on query
  const filteredMentions = (mentionQuery && showMentions)
    ? allUsers.filter((u) =>
        u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  // Handle input change with mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  // Insert mention
  const insertMention = (mentionUser: { id: string; full_name: string }) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);
    
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${mentionUser.full_name} `);
    setContent(newTextBefore + textAfterCursor);
    setShowMentions(false);
    setMentionQuery("");
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ content: commentContent, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from("event_comments").insert({
        event_id: eventId,
        user_id: user!.id,
        content: commentContent,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
      setContent("");
      setReplyTo(null);
      triggerFeedback({ haptic: "success", sound: "success" });
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
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
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
    triggerFeedback({ haptic: "light", sound: "tap" });
    addComment.mutate({ content: content.trim(), parentId: replyTo?.id });
  };

  const handleReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, userName: comment.profile?.full_name || "Usuário" });
    setContent(`@${comment.profile?.full_name || "Usuário"} `);
    inputRef.current?.focus();
    triggerFeedback({ haptic: "selection" });
  };

  const parentComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

  // Render content with highlighted mentions
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comments list - scrollable area */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Heart className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Ainda não há comentários</p>
            <p className="text-xs text-muted-foreground">Seja o primeiro a comentar neste evento!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {parentComments.map((comment) => {
              const replies = getReplies(comment.id);
              const hasReplies = replies.length > 0;
              const isExpanded = expandedReplies.has(comment.id);

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  {/* Parent comment - Instagram style */}
                  <div className="flex gap-3 group">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={comment.profile?.photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-semibold">
                        {getInitials(comment.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">
                            <span className="font-semibold mr-1.5">
                              {comment.profile?.full_name || "Usuário"}
                            </span>
                            {renderContent(comment.content)}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: false,
                                locale: ptBR,
                              })}
                            </span>
                            <button
                              onClick={() => handleReply(comment)}
                              className="font-medium hover:text-foreground transition-colors"
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                        
                        {user?.id === comment.user_id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[120px]">
                              <DropdownMenuItem
                                onClick={() => deleteComment.mutate(comment.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* View replies toggle */}
                      {hasReplies && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="w-6 h-px bg-muted-foreground/30" />
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              <span>Ocultar respostas</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              <span>Ver {replies.length} resposta{replies.length > 1 ? "s" : ""}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  <AnimatePresence>
                    {isExpanded && hasReplies && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-12 space-y-3"
                      >
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5 group">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={reply.profile?.photo_url || undefined} />
                              <AvatarFallback className="bg-muted text-[10px] font-semibold">
                                {getInitials(reply.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm leading-relaxed">
                                    <span className="font-semibold mr-1.5">
                                      {reply.profile?.full_name || "Usuário"}
                                    </span>
                                    {renderContent(reply.content)}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                                    <span>
                                      {formatDistanceToNow(new Date(reply.created_at), {
                                        addSuffix: false,
                                        locale: ptBR,
                                      })}
                                    </span>
                                    <button
                                      onClick={() => handleReply(reply)}
                                      className="font-medium hover:text-foreground transition-colors"
                                    >
                                      Responder
                                    </button>
                                  </div>
                                </div>
                                
                                {user?.id === reply.user_id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[120px]">
                                      <DropdownMenuItem
                                        onClick={() => deleteComment.mutate(reply.id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
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
        )}
      </div>

      {/* Add comment form - Fixed at bottom, Instagram style */}
      <div className="border-t border-border pt-3 mt-3">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-muted-foreground">
              Respondendo a <span className="font-semibold text-foreground">{replyTo.userName}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setContent("");
              }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Cancelar
            </button>
          </div>
        )}
        
        {user ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Adicione um comentário..."
                value={content}
                onChange={handleContentChange}
                className={cn(
                  "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                  "py-2 border-none focus:ring-0"
                )}
              />
              
              {/* Mention suggestions */}
              <AnimatePresence>
                {showMentions && filteredMentions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {filteredMentions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => insertMention(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.photo_url || undefined} />
                          <AvatarFallback className="text-xs font-medium">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.full_name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={!content.trim() || addComment.isPending}
              className={cn(
                "text-primary font-semibold px-0 hover:bg-transparent",
                !content.trim() && "text-muted-foreground"
              )}
            >
              {addComment.isPending ? (
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                "Publicar"
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              <a href="/login" className="text-primary font-semibold hover:underline">Faça login</a>
              {" "}para comentar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
