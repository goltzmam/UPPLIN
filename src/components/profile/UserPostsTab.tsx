import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { MentionInput, renderTextWithMentions } from "@/components/ui/mention-input";
import { PostMedia } from "./PostMedia";
import { createUserPost, getPostMediaValidationError, invalidateSocialQueries } from "@/lib/social-posts";
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
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
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

  const resetComposer = () => {
    setContent("");
    setMediaUrl(null);
    setMediaType(null);
    setSelectedFile(null);
    setIsCreating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async () => {
    if (!user || submittingPost) return;

    setSubmittingPost(true);

    try {
      await createUserPost({
        userId: user.id,
        content,
        file: selectedFile,
      });

      await invalidateSocialQueries(queryClient, user.id);
      resetComposer();
    } catch (error) {
      console.error("Erro ao criar post:", error);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || deletingPostId) return;

    setDeletingPostId(postId);

    try {
      const { error } = await supabase.from("user_posts").delete().eq("id", postId);
      if (error) throw error;

      await invalidateSocialQueries(queryClient, user.id);
    } catch (error) {
      console.error("Erro ao excluir post:", error);
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = getPostMediaValidationError(file);
    if (validationError) {
      console.error(validationError);
      return;
    }

    try {
      setUploading(true);
      setSelectedFile(file);
      setMediaUrl(URL.createObjectURL(file));
      setMediaType(file.type.startsWith("image/") ? "image" : "video");
    } catch (error) {
      console.error("Upload error:", error);
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
              <MentionInput
                placeholder="O que você está pensando? Use @ para marcar organizadores"
                value={content}
                onChange={setContent}
                className="bg-background border-border"
                minHeight="100px"
              />

              {mediaUrl && (
                <div className="relative">
                  <PostMedia
                    mediaUrl={mediaUrl}
                    mediaType={mediaType}
                    alt="Preview"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaType(null);
                      setSelectedFile(null);
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
                      accept="image/*,video/mp4,video/webm,video/ogg"
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
                      Mídia
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetComposer();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gradient gap-2"
                    onClick={handleCreatePost}
                    disabled={submittingPost}
                  >
                    {submittingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                          onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                          {deletingPostId === post.id ? "Excluindo..." : "Excluir"}
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
                  <div className="mb-3">
                    <PostMedia
                      mediaUrl={post.media_url}
                      mediaType={post.media_type}
                      alt="Mídia do post"
                    />
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
