import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShimmerSkeleton } from "@/components/ui/skeleton";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function Loading({ className, size = "md", text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loading size="lg" text="Carregando..." />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-[16/9]">
        <ShimmerSkeleton className="absolute inset-0 rounded-none" />
      </div>
      <div className="p-4 space-y-3">
        <ShimmerSkeleton className="h-5 w-3/4" />
        <div className="space-y-2">
          <ShimmerSkeleton className="h-4 w-1/2" />
          <ShimmerSkeleton className="h-4 w-2/3" />
        </div>
        <ShimmerSkeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
