import { SafetyActions } from "@/components/safety/SafetyActions";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventReviewsProps {
  eventId: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user_id: string;
  created_at: string;
  moderation_status?: string;
  profile?: {
    full_name: string | null;
    photo_url: string | null;
  };
}

export function EventReviews({ eventId }: EventReviewsProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has used ticket for this event
  const { data: hasAttended = false } = useQuery({
    queryKey: ["user-attended-event", eventId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("tickets")
        .select("id")
        .eq("event_id", eventId)
        .eq("buyer_user_id", user.id)
        .eq("status", "used")
        .limit(1)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user already reviewed
  const { data: userReview } = useQuery({
    queryKey: ["user-review", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("event_reviews")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all reviews
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["event-reviews", eventId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_reviews")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      if (!data.length) return [];
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((review) => ({
        ...review,
        profile: profileMap.get(review.user_id),
      })) as Review[];
    },
  });

  // Calculate average rating
  const approvedReviews = reviews.filter(review => !review.moderation_status || review.moderation_status === "approved");
  const averageRating = approvedReviews.length > 0
    ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length
    : 0;

  // Add review mutation
  const addReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("event_reviews").insert({
        event_id: eventId,
        user_id: user!.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-reviews", eventId] });
      queryClient.invalidateQueries({ queryKey: ["user-review", eventId, user?.id] });
      setRating(0);
      setComment("");
      toast({ title: "Avaliação enviada!" });
    },
    onError: (error: any) => {
      if (error.message?.includes("row-level security")) {
        toast({ 
          title: "Você precisa ter participado do evento", 
          description: "Só é possível avaliar após check-in no evento.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Erro ao enviar avaliação", variant: "destructive" });
      }
    },
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("event_reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-reviews", eventId] });
      queryClient.invalidateQueries({ queryKey: ["user-review", eventId, user?.id] });
      toast({ title: "Avaliação excluída" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Selecione uma avaliação", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Faça login para avaliar", variant: "destructive" });
      return;
    }
    addReview.mutate();
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const StarRating = ({ 
    value, 
    onChange, 
    onHover, 
    readonly = false,
    size = "md" 
  }: { 
    value: number; 
    onChange?: (val: number) => void; 
    onHover?: (val: number) => void;
    readonly?: boolean;
    size?: "sm" | "md";
  }) => {
    const displayValue = onHover ? hoverRating || value : value;
    const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-transform ${!readonly && "hover:scale-110"}`}
          >
            <Star
              className={`${starSize} ${
                star <= displayValue
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <h3 className="font-semibold">Avaliações</h3>
        </div>
        {approvedReviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(averageRating)} readonly size="sm" />
            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({approvedReviews.length})</span>
          </div>
        )}
      </div>

      {/* Add review form */}
      {user && !userReview && hasAttended && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-foreground text-background text-xs">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Avalie este evento</p>
              <StarRating 
                value={rating} 
                onChange={setRating}
                onHover={setHoverRating}
              />
            </div>
          </div>
          
          {rating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <Textarea
                placeholder="Conte como foi sua experiência (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <Button 
                type="submit" 
                size="sm" 
                className="rounded-full"
                disabled={addReview.isPending}
              >
                Enviar Avaliação
              </Button>
            </motion.div>
          )}
        </form>
      )}

      {user && userReview && (
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Você já avaliou este evento com {userReview.rating} estrelas
          </p>
        </div>
      )}

      {user && !hasAttended && !userReview && (
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Participe do evento para poder avaliar
          </p>
        </div>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Faça login para avaliar
        </p>
      )}

      {/* Reviews list */}
      <div className="space-y-4 mt-6">
        <AnimatePresence>
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={review.profile?.photo_url || undefined} />
                <AvatarFallback className="bg-muted text-xs">
                  {getInitials(review.profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm break-words">
                      {review.profile?.full_name || "Usuário"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SafetyActions userId={review.user_id} kind="review" targetId={review.id} />
                    <StarRating value={review.rating} readonly size="sm" />
                    {user?.id === review.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deleteReview.mutate(review.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                {review.moderation_status === "pending" && <p className="text-xs text-amber-400">Em análise pelo suporte · visível apenas para você</p>}
                {review.moderation_status === "hidden" && <p className="text-xs text-muted-foreground">Avaliação oculta pelo suporte</p>}
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando avaliações...
          </div>
        )}

        {!isLoading && reviews.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma avaliação ainda</p>
            <p className="text-xs">Seja o primeiro a avaliar!</p>
          </div>
        )}
      </div>
    </div>
  );
}
