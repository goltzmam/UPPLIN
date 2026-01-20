import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/use-follow";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  organizerId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showCount?: boolean;
  className?: string;
}

export function FollowButton({
  organizerId,
  variant = "outline",
  size = "sm",
  showCount = false,
  className,
}: FollowButtonProps) {
  const { isFollowing, isLoading, followerCount, toggleFollow } = useFollow(organizerId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={isFollowing ? "secondary" : variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFollow();
        }}
        disabled={isLoading}
        className={cn(
          "gap-1.5 transition-all",
          isFollowing && "bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="h-4 w-4" />
            <span>Seguindo</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>Seguir</span>
          </>
        )}
      </Button>
      {showCount && followerCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {followerCount.toLocaleString("pt-BR")} {followerCount === 1 ? "seguidor" : "seguidores"}
        </span>
      )}
    </div>
  );
}
