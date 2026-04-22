import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { PostLikeButton } from "./PostLikeButton";
import { PostComments } from "./PostComments";
import { useState } from "react";
import { PostMedia } from "./PostMedia";

interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  event_id: string | null;
  profile: {
    full_name: string | null;
    photo_url: string | null;
  };
  events?: {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
  } | null;
}

export function SocialFeedTab() {
  const { user } = useAuth();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-feed", user?.id],
    queryFn: async () => {
      // Get organizers the user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("organizer_id")
        .eq("user_id", user!.id);

      if (!follows?.length) return [];

      // Get owner user IDs of those organizers
      const { data: organizers } = await supabase
        .from("organizer_accounts_feed")
        .select("owner_user_id")
        .in("id", follows.map((f) => f.organizer_id));

      if (!organizers?.length) return [];

      const ownerIds = organizers.map((o) => o.owner_user_id);

      // Get posts from those users
      const { data: postsData, error } = await supabase
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
        .in("user_id", ownerIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profiles for posts
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return postsData.map((post) => ({
        ...post,
        profile: profileMap.get(post.user_id) || { full_name: null, photo_url: null },
      })) as FeedPost[];
    },
    enabled: !!user,
  });

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  if (isLoading) return <PageLoading />;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-accent" />}
        title="Sua timeline está vazia"
        description="Siga organizadores para ver posts e atualizações aqui!"
        variant="default"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold px-1">Atualizações de quem você segue</h3>
      
      {posts.map((post) => (
        <Card key={post.id} className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profile?.photo_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {post.profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{post.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            {post.content && (
              <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
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
            <div className="flex items-start gap-2 pt-3 border-t border-border">
              <PostLikeButton postId={post.id} />
              <PostComments
                postId={post.id}
                isExpanded={expandedComments.has(post.id)}
                onToggle={() => toggleComments(post.id)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
