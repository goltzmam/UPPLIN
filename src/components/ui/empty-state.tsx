import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Use dark variant for dark backgrounds like feed pages */
  variant?: "default" | "dark";
}

export function EmptyState({ icon, title, description, action, className, variant = "default" }: EmptyStateProps) {
  const isDark = variant === "dark";
  
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      <div className={cn(
        "flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl mb-4 border",
        // Always use semantic tokens so contrast works in light/dark themes
        isDark
          ? "bg-background/40 border-border/50 backdrop-blur-sm"
          : "bg-muted border-border"
      )}>
        <span className="gradient-text">{icon}</span>
      </div>
      <h3 className={cn(
        "font-display text-lg font-semibold mb-1",
        "text-foreground"
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-sm max-w-sm mb-4",
          "text-muted-foreground"
        )}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
