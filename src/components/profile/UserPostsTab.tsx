import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Send, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostLikeButton } from "./PostLikeButton";
import { PostComments } from "./PostComments";

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

export function UserPostsTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const createPost = useMutation({
    mutationFn: async () => {
      if (!content.trim() && !mediaUrl) {
        throw new Error("Adicione texto ou mídia ao seu post");
      }

      const { error } = await supabase.from("user_posts").insert({
        user_id: user!.id,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", user?.id] });
      setContent("");
      setMediaUrl(null);
      setMediaType(null);
      setIsCreating(false);
      toast.success("Post publicado!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      toast.success("Post excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir post");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB)");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setMediaUrl(urlData.publicUrl);
      setMediaType("image");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
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
              <Textarea
                placeholder="O que você está pensando?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none bg-background border-border"
              />

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
                    accept="image/jpeg,image/png,image/webp,image/gif"
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
                    Foto
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
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gradient gap-2"
                    onClick={() => createPost.mutate()}
                    disabled={createPost.isPending}
                  >
                    <Send className="h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              </div>
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
                  <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                )}

                {post.media_url && (
                  <div className="rounded-lg overflow-hidden mb-3">
                    {post.media_type === "image" ? (
                      <img
                        src={post.media_url}
                        alt="Post media"
                        className="w-full object-cover"
                      />
                    ) : (
                      <video
                        src={post.media_url}
                        className="w-full"
                        controls
                      />
                    )}
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
