import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, User, TrendingUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { normalizeText } from "@/lib/categories";

interface FeedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: "event" | "organizer";
  id: string;
  slug?: string | null;
  title: string;
  subtitle?: string;
  image?: string | null;
}

interface TrendingEvent {
  id: string;
  title: string;
  slug: string | null;
  cover_image_url: string | null;
}

export function FeedSearch({ isOpen, onClose }: FeedSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Fetch trending events in real-time
  const { data: trendingEvents } = useQuery({
    queryKey: ["trending-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug, cover_image_url")
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(4);
      
      return (data || []) as TrendingEvent[];
    },
    staleTime: 60000,
    enabled: isOpen,
  });

  // Real-time search with debounce
  const { data: searchResults, isLoading, isFetching } = useQuery({
    queryKey: ["feed-search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const results: SearchResult[] = [];

      const [{ data: events }, { data: organizers }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, slug, venue_name, cover_image_url")
          .eq("status", "published")
          .or(`title.ilike.%${debouncedQuery}%,venue_name.ilike.%${debouncedQuery}%,address_text.ilike.%${debouncedQuery}%`)
          .order("start_at", { ascending: true })
          .limit(5),
        supabase
          .from("organizer_accounts")
          .select("id, display_name, slug, logo_url")
          .eq("status", "active")
          .or(`display_name.ilike.%${debouncedQuery}%,slug.ilike.%${debouncedQuery}%`)
          .limit(3),
      ]);

      events?.forEach((event) => {
        results.push({
          type: "event",
          id: event.id,
          slug: event.slug,
          title: event.title,
          subtitle: event.venue_name || undefined,
          image: event.cover_image_url,
        });
      });

      organizers?.forEach((org) => {
        results.push({
          type: "organizer",
          id: org.id,
          slug: org.slug,
          title: org.display_name,
          subtitle: org.slug ? `@${org.slug}` : undefined,
          image: org.logo_url,
        });
      });

      return results;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 10000,
  });

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  }, [navigate, onClose]);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.type === "event") {
      navigate(`/evento/${result.slug || result.id}`);
    } else {
      navigate(`/o/${result.slug || result.id}`);
    }
    onClose();
  }, [navigate, onClose]);

  const handleTrendingClick = useCallback((event: TrendingEvent) => {
    navigate(`/evento/${event.slug || event.id}`);
    onClose();
  }, [navigate, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const showLoading = isLoading || (isFetching && debouncedQuery.length >= 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="safe-area-top" />
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <form onSubmit={handleSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar eventos, organizadores..."
                className="w-full pl-10 pr-4 h-10 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              {showLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
                </div>
              )}
            </form>
            <button
              onClick={onClose}
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Cancelar
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4 overflow-y-auto max-h-[calc(100dvh-70px)] scrollbar-hide">
            {debouncedQuery.length >= 2 ? (
              <div className="space-y-1">
                {searchResults && searchResults.length > 0 ? (
                  <>
                    {searchResults.map((result, index) => (
                      <motion.button
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors text-left group"
                      >
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className={cn(
                              "h-10 w-10 object-cover flex-shrink-0",
                              result.type === "organizer" ? "rounded-full" : "rounded-lg"
                            )}
                          />
                        ) : (
                          <div className={cn(
                            "h-10 w-10 bg-muted flex items-center justify-center flex-shrink-0",
                            result.type === "organizer" ? "rounded-full" : "rounded-lg"
                          )}>
                            {result.type === "event" ? (
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium text-sm truncate group-hover:text-accent transition-colors">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-muted-foreground text-xs truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                          {result.type === "event" ? "Evento" : "Org"}
                        </span>
                      </motion.button>
                    ))}
                    
                    <button
                      onClick={() => handleSearch(query)}
                      className="w-full flex items-center justify-center gap-2 p-3 mt-3 text-accent font-medium text-sm hover:bg-accent/10 rounded-xl transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Ver todos para "{query}"
                    </button>
                  </>
                ) : !showLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">Nenhum resultado para "{debouncedQuery}"</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Trending Events from DB */}
                {trendingEvents && trendingEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Em alta</p>
                    </div>
                    <div className="space-y-0.5">
                      {trendingEvents.map((event, index) => (
                        <motion.button
                          key={event.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleTrendingClick(event)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors text-left"
                        >
                          <span className="h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          {event.cover_image_url ? (
                            <img 
                              src={event.cover_image_url} 
                              alt="" 
                              className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : null}
                          <span className="text-foreground text-sm truncate flex-1">{event.title}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick filters */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Explorar por</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { navigate("/eventos"); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left"
                    >
                      <Calendar className="h-5 w-5 text-accent" />
                      <span className="text-foreground text-sm font-medium">Eventos</span>
                    </button>
                    <button
                      onClick={() => { navigate("/explorar-organizadores"); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left"
                    >
                      <User className="h-5 w-5 text-accent" />
                      <span className="text-foreground text-sm font-medium">Organizadores</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
