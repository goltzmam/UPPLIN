import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Send, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostLikeButton } from "./PostLikeButton";
import { PostComments } from "./PostComments";
import { PostMedia } from "./PostMedia";
import { MentionInput, renderTextWithMentions } from "@/components/ui/mention-input";
interface UserPost {
  id: string;
  user_id: string;
  event_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  events?: {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
  } | null;
}

interface TaggableEvent {
  id: string;
  title: string;
  venue_name: string | null;
  start_at: string;
}

export function UserPostsTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigate to organizer profile when mention is clicked
  const handleMentionClick = (slug: string) => {
    navigate(`/o/${slug}`);
  };
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_posts")
        .select(`
          *,
          events:event_id (
            id,
            slug,
            title,
            cover_image_url
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserPost[];
    },
    enabled: !!user,
  });

  const { data: taggableEvents = [] } = useQuery({
    queryKey: ["user-events-for-posting", user?.id],
    queryFn: async () => {
      if (!user) return [] as TaggableEvent[];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          event_id,
          events:event_id (
            id,
            title,
            venue_name,
            start_at
          )
        `)
        .eq("buyer_user_id", user.id)
        .eq("status", "issued");

      if (error) throw error;

      const dedupedEvents = new Map<string, TaggableEvent>();

      for (const ticket of data ?? []) {
        const event = ticket.events as TaggableEvent | null;
        if (event && !dedupedEvents.has(event.id)) {
          dedupedEvents.set(event.id, event);
        }
      }

      return Array.from(dedupedEvents.values()).sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
    },
    enabled: !!user && isCreating,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Faça login para publicar.");
      }

      if (!content.trim() && !mediaUrl) {
        throw new Error("Adicione texto ou mídia ao seu post");
      }

      const { error } = await supabase.from("user_posts").insert({
        user_id: user.id,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        event_id: selectedEventId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", user?.id] });
      setContent("");
      setMediaUrl(null);
      setMediaType(null);
      setSelectedEventId("");
      setFormError(null);
      setIsCreating(false);
    },
    onError: (error: Error) => {
      setFormError(error.message || "Não foi possível publicar agora.");
      console.error("Erro ao criar post:", error.message);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("user_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", user?.id] });
    },
    onError: (error) => {
      console.error("Erro ao excluir post:", error);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setFormError("Envie uma imagem ou vídeo válido.");
      e.target.value = "";
      return;
    }

    const maxFileSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setFormError(
        isVideo
          ? "Vídeos podem ter até 50MB."
          : "Imagens podem ter até 10MB."
      );
      e.target.value = "";
      return;
    }

    setFormError(null);
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-posts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user-posts")
        .getPublicUrl(fileName);

      setMediaUrl(urlData.publicUrl);
      setMediaType(isVideo ? "video" : "image");
    } catch (error) {
      setFormError("Não foi possível enviar a mídia agora.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Create Post Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          {isCreating ? (
            <div className="space-y-4">
              <MentionInput
                placeholder="O que você está pensando? Use @ para marcar organizadores"
                value={content}
                onChange={(value) => {
                  setContent(value);
                  if (formError) setFormError(null);
                }}
                className="bg-background border-border"
                minHeight="100px"
              />

              {taggableEvents.length > 0 && (
                <div className="space-y-2">
                  <label htmlFor="post-event" className="text-sm font-medium text-foreground">
                    Marcar evento opcionalmente
                  </label>
                  <select
                    id="post-event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Sem evento marcado</option>
                    {taggableEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}{event.venue_name ? ` • ${event.venue_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mediaUrl && (
                <div className="relative">
                  {mediaType === "image" ? (
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      className="w-full max-h-64 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaType(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Foto ou vídeo
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setContent("");
                      setMediaUrl(null);
                      setMediaType(null);
                      setSelectedEventId("");
                      setFormError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gradient gap-2"
                    onClick={() => createPost.mutate()}
                    disabled={createPost.isPending || uploading || (!content.trim() && !mediaUrl)}
                  >
                    <Send className="h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setIsCreating(true)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.photo_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 px-4 py-2 bg-muted rounded-full text-muted-foreground text-sm">
                Compartilhe algo...
              </div>
              <Camera className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts List */}
      {posts.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-8 w-8 text-accent" />}
          title="Nenhum post ainda"
          description="Compartilhe suas experiências em eventos!"
          variant="default"
          action={
            <Button
              className="btn-gradient"
              onClick={() => setIsCreating(true)}
            >
              Criar primeiro post
            </Button>
          }
          className="py-12"
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-card border-border overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {profile?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deletePost.mutate(post.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {post.content && (
                  <p className="text-sm mb-3 whitespace-pre-wrap">
                    {renderTextWithMentions(post.content, handleMentionClick)}
                  </p>
                )}

                {post.media_url && (
                  <div className="mb-3 overflow-hidden rounded-lg">
                    <PostMedia mediaUrl={post.media_url} mediaType={post.media_type} className="max-h-[32rem]" />
                  </div>
                )}

                {post.events && (
                  <Link
                    to={`/evento/${post.events.slug || post.events.id}`}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors mb-3"
                  >
                    {post.events.cover_image_url && (
                      <img
                        src={post.events.cover_image_url}
                        alt={post.events.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <span className="text-sm font-medium">{post.events.title}</span>
                  </Link>
                )}

                {/* Like and Comment Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <PostLikeButton postId={post.id} />
                  <PostComments
                    postId={post.id}
                    isExpanded={expandedComments.has(post.id)}
                    onToggle={() => {
                      setExpandedComments((prev) => {
                        const next = new Set(prev);
                        if (next.has(post.id)) {
                          next.delete(post.id);
                        } else {
                          next.add(post.id);
                        }
                        return next;
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
