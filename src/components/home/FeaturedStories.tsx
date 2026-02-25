import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, Play } from "lucide-react";
import { motion } from "framer-motion";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

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
      <div className="py-5">
        <div className="flex items-center gap-2 px-4 mb-4">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse" />
          <div className="w-24 h-4 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-3 px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayEvents = featuredEvents?.length ? featuredEvents : [
    { id: "placeholder-1", title: "Em breve", cover_image_url: null, organizer: null },
    { id: "placeholder-2", title: "Destaque", cover_image_url: null, organizer: null },
    { id: "placeholder-3", title: "Patrocinado", cover_image_url: null, organizer: null },
  ];

  return (
    <div className="py-4 md:py-2 relative">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 md:px-0 mb-4">
        <div className="relative">
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center">
            <Play className="h-3 w-3 md:h-3.5 md:w-3.5 text-white fill-white ml-0.5" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
          </span>
        </div>
        <h2 className="font-display text-base md:text-lg font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent">
          Stories
        </h2>
      </div>

      {/* Native scrollable stories container */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 px-4 md:px-0 overflow-x-auto scroll-smooth snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {displayEvents.map((event, index) => {
          const isPlaceholder = event.id.startsWith("placeholder");
          
          return (
            <motion.div
              key={event.id}
              className="flex flex-col items-center gap-2 flex-shrink-0 snap-start"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              {isPlaceholder ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative w-20 h-20 rounded-2xl bg-background border border-border flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <Link to={`/evento/${event.id}`} className="relative group block active:scale-[0.95] transition-transform duration-150">
                  {/* Gradient ring */}
                  <div className="absolute -inset-[3px] bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 rounded-2xl md:rounded-3xl" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden ring-2 ring-background">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : event.organizer?.logo_url ? (
                      <img
                        src={event.organizer.logo_url}
                        alt={event.organizer.display_name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white font-bold text-lg md:text-xl">
                        {event.title[0]}
                      </div>
                    )}
                    {/* Play indicator overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-6 w-6 md:h-7 md:w-7 text-white fill-white" />
                    </div>
                  </div>
                </Link>
              )}
              <span className={cn(
                "text-[11px] font-medium text-center max-w-[80px] truncate",
                isPlaceholder ? "text-muted-foreground" : "text-foreground"
              )}>
                {isPlaceholder ? event.title : (event.organizer?.display_name || event.title)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Left fade */}
      <div className={cn(
        "absolute left-0 top-12 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
        canScrollLeft ? "opacity-100" : "opacity-0"
      )} />
      {/* Right fade */}
      <div className={cn(
        "absolute right-0 top-12 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
        canScrollRight ? "opacity-100" : "opacity-0"
      )} />
    </div>
  );
}
