import { memo } from "react";
import { cn } from "@/lib/utils";

interface FeedSkeletonProps {
  className?: string;
}

export const FeedSkeleton = memo(function FeedSkeleton({ className }: FeedSkeletonProps) {
  return (
    <div 
      className={cn(
        "relative w-full h-full overflow-hidden bg-black",
        className
      )}
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      
      {/* Moving shimmer effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)'
          }}
        />
      </div>

      {/* Top organizer skeleton */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] left-3 right-16 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-700/60 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-28 rounded bg-zinc-700/60 animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-zinc-700/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right side action buttons skeleton */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div 
              className="h-11 w-11 rounded-full bg-zinc-700/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <div className="h-2 w-6 rounded bg-zinc-700/40 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Bottom content skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-10">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-3">
            {/* Price badge */}
            <div className="h-6 w-16 rounded-full bg-zinc-700/60 animate-pulse" />
            
            {/* Title */}
            <div className="space-y-2">
              <div className="h-5 w-4/5 rounded bg-zinc-700/60 animate-pulse" />
              <div className="h-5 w-3/5 rounded bg-zinc-700/50 animate-pulse" />
            </div>
            
            {/* Date and location */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-zinc-700/40 animate-pulse" />
                <div className="h-3.5 w-32 rounded bg-zinc-700/40 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-zinc-700/40 animate-pulse" />
                <div className="h-3.5 w-40 rounded bg-zinc-700/40 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-white/10 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-t-white/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
});

export const FeedLoadingOverlay = memo(function FeedLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-white/80 text-sm font-medium">Carregando mais...</span>
      </div>
    </div>
  );
});
