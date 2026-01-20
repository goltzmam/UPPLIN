import { ReactNode } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, progress, shouldTrigger } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 120,
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
        style={{
          top: -60,
          height: 60,
        }}
        animate={{
          y: pullDistance,
          opacity: progress > 0 ? 1 : 0,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <motion.div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center bg-background border border-border shadow-lg",
            shouldTrigger && "bg-accent border-accent"
          )}
          animate={{
            scale: shouldTrigger ? 1.1 : 0.8 + progress * 0.2,
          }}
        >
          <motion.div
            animate={{
              rotate: isRefreshing ? 360 : progress * 180,
            }}
            transition={
              isRefreshing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { type: "spring", damping: 15 }
            }
          >
            <RefreshCw
              className={cn(
                "h-5 w-5 transition-colors",
                shouldTrigger || isRefreshing ? "text-accent-foreground" : "text-muted-foreground"
              )}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content with pull transform */}
      <motion.div
        animate={{
          y: pullDistance > 0 ? pullDistance * 0.5 : 0,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
