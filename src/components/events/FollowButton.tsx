import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/use-follow";
import { UserPlus, UserCheck, Loader2, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FollowButtonProps {
  organizerId: string;
  variant?: "default" | "outline" | "ghost" | "premium";
  size?: "default" | "sm" | "lg" | "icon";
  showCount?: boolean;
  className?: string;
  onFollowerCountChange?: (count: number) => void;
}

export function FollowButton({
  organizerId,
  variant = "outline",
  size = "sm",
  showCount = false,
  className,
  onFollowerCountChange,
}: FollowButtonProps) {
  const { isFollowing, isLoading, followerCount, toggleFollow } = useFollow(organizerId);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Notify parent of follower count changes
  useEffect(() => {
    if (onFollowerCountChange) {
      onFollowerCountChange(followerCount);
    }
  }, [followerCount, onFollowerCountChange]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isFollowing) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 600);
    }
    
    toggleFollow();
  };

  // Premium variant - more visually striking
  if (variant === "premium") {
    return (
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative overflow-hidden rounded-full px-6 py-3 font-semibold text-sm transition-all duration-300",
          isFollowing
            ? "bg-muted text-foreground border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
            : "bg-gradient-to-r from-accent via-pink-500 to-accent text-white shadow-lg shadow-accent/25 hover:shadow-accent/40",
          isLoading && "opacity-70 pointer-events-none",
          className
        )}
      >
        {/* Animated shine effect */}
        {!isFollowing && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: isHovered ? "100%" : "-100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}

        <span className="relative flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isFollowing ? (
            <>
              <motion.div
                initial={false}
                animate={{ rotate: isHovered ? [0, -10, 10, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isHovered ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </motion.div>
              <span>{isHovered ? "Deixar de seguir" : "Seguindo"}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Seguir</span>
            </>
          )}
        </span>

        {/* Confetti particles */}
        <AnimatePresence>
          {showConfetti && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{
                    background: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"][i % 5],
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 8) * 40,
                    y: Math.sin((i * Math.PI * 2) / 8) * 40 - 20,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={isFollowing ? "secondary" : variant === "default" ? "default" : "outline"}
        size={size}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={cn(
          "gap-1.5 transition-all relative overflow-hidden",
          isFollowing && "hover:bg-destructive hover:text-destructive-foreground"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="h-4 w-4" />
            <span>{isHovered ? "Deixar" : "Seguindo"}</span>
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

// Animated follower counter component
export function AnimatedFollowerCount({ count, className }: { count: number; className?: string }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [isDecreasing, setIsDecreasing] = useState(false);

  useEffect(() => {
    if (count > displayCount) {
      setIsIncreasing(true);
      setTimeout(() => setIsIncreasing(false), 300);
    } else if (count < displayCount) {
      setIsDecreasing(true);
      setTimeout(() => setIsDecreasing(false), 300);
    }
    setDisplayCount(count);
  }, [count, displayCount]);

  return (
    <motion.span
      className={cn(
        "font-bold tabular-nums transition-colors",
        isIncreasing && "text-green-500",
        isDecreasing && "text-red-500",
        className
      )}
      animate={{
        scale: isIncreasing || isDecreasing ? [1, 1.1, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {displayCount.toLocaleString("pt-BR")}
    </motion.span>
  );
}
