import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface FeaturedEvent {
  id: string;
  title: string;
  cover_image_url: string | null;
  organizer: {
    display_name: string;
    logo_url: string | null;
  } | null;
}

export function FeaturedStories() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: featuredEvents, isLoading } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          cover_image_url,
          organizer:organizer_accounts(display_name, logo_url)
        `)
        .eq("status", "published")
        .or("is_featured.eq.true,is_sponsored.eq.true")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as FeaturedEvent[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-4 px-4 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
            <div className="w-14 h-3 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  // If no featured events, show placeholder stories
  const displayEvents = featuredEvents?.length ? featuredEvents : [
    { id: "placeholder-1", title: "Em breve", cover_image_url: null, organizer: null },
    { id: "placeholder-2", title: "Destaque", cover_image_url: null, organizer: null },
    { id: "placeholder-3", title: "Patrocinado", cover_image_url: null, organizer: null },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto py-4 px-4 scrollbar-hide">
      {displayEvents.map((event, index) => {
        const isPlaceholder = event.id.startsWith("placeholder");
        
        return (
          <div
            key={event.id}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            {isPlaceholder ? (
              <div className="story-ring">
                <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <Link to={`/evento/${event.id}`} className="story-ring">
                <div className="w-[68px] h-[68px] rounded-full overflow-hidden bg-muted">
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  ) : event.organizer?.logo_url ? (
                    <img
                      src={event.organizer.logo_url}
                      alt={event.organizer.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white font-bold">
                      {event.title[0]}
                    </div>
                  )}
                </div>
              </Link>
            )}
            <span className={cn(
              "text-xs font-medium text-center max-w-[72px] truncate",
              isPlaceholder ? "text-muted-foreground" : "text-foreground"
            )}>
              {isPlaceholder ? event.title : (event.organizer?.display_name || event.title)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
