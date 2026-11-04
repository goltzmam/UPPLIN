import { memo } from "react";
import { SmartVideo } from "./SmartVideo";
import { cn } from "@/lib/utils";

export const FeedVideoPlayer = memo(function FeedVideoPlayer({ videoUrl, coverUrl, isActive, forceStop = false, className }: {
  videoUrl: string; coverUrl: string | null; isActive: boolean; forceStop?: boolean; className?: string;
}) {
  return <SmartVideo feed src={videoUrl} poster={coverUrl} active={isActive && !forceStop} className={cn("absolute inset-0 h-full w-full", className)} />;
});
