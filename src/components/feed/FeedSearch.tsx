import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MapPin, User, Calendar, TrendingUp, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface FeedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: "event" | "organizer" | "location";
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
}

const recentSearches = [
  "Shows ao vivo",
  "Festas em SP",
  "Eventos gratuitos",
];

const trendingSearches = [
  "Festival de música",
  "Stand-up comedy",
  "Workshops",
  "Happy hour",
];

export function FeedSearch({ isOpen, onClose }: FeedSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Search events and organizers
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["feed-search", query],
    queryFn: async () => {
      if (query.length < 2) return [];

      const results: SearchResult[] = [];

      // Search events
      const { data: events } = await supabase
        .from("events")
        .select("id, title, venue_name, cover_image_url")
        .eq("status", "published")
        .or(`title.ilike.%${query}%,venue_name.ilike.%${query}%,address_text.ilike.%${query}%`)
        .limit(5);

      if (events) {
        events.forEach((event) => {
          results.push({
            type: "event",
            id: event.id,
            title: event.title,
            subtitle: event.venue_name || undefined,
            image: event.cover_image_url,
          });
        });
      }

      // Search organizers
      const { data: organizers } = await supabase
        .from("organizer_accounts")
        .select("id, display_name, slug, logo_url")
        .eq("status", "active")
        .or(`display_name.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(3);

      if (organizers) {
        organizers.forEach((org) => {
          results.push({
            type: "organizer",
            id: org.id,
            title: org.display_name,
            subtitle: org.slug ? `@${org.slug}` : undefined,
            image: org.logo_url,
          });
        });
      }

      return results;
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "event") {
      navigate(`/evento/${result.id}`);
    } else if (result.type === "organizer") {
      navigate(`/organizador/${result.id}`);
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="safe-area-top" />
          <div className="flex items-center gap-3 px-4 py-3">
            <form onSubmit={handleSubmit} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar eventos, organizadores, locais..."
                className="w-full pl-12 pr-4 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl focus-visible:ring-white/30"
              />
            </form>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {query.length >= 2 ? (
              // Search Results
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <>
                    <p className="text-white/50 text-sm mb-3">Resultados</p>
                    {searchResults.map((result) => (
                      <motion.button
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                      >
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className={cn(
                              "h-12 w-12 object-cover",
                              result.type === "organizer" ? "rounded-full" : "rounded-lg"
                            )}
                          />
                        ) : (
                          <div className={cn(
                            "h-12 w-12 bg-white/10 flex items-center justify-center",
                            result.type === "organizer" ? "rounded-full" : "rounded-lg"
                          )}>
                            {result.type === "event" ? (
                              <Calendar className="h-5 w-5 text-white/50" />
                            ) : (
                              <User className="h-5 w-5 text-white/50" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-white/50 text-sm truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          result.type === "event" 
                            ? "bg-primary/20 text-primary" 
                            : "bg-accent/20 text-accent"
                        )}>
                          {result.type === "event" ? "Evento" : "Organizador"}
                        </div>
                      </motion.button>
                    ))}
                    
                    {/* Search all button */}
                    <button
                      onClick={() => handleSearch(query)}
                      className="w-full flex items-center justify-center gap-2 p-4 mt-4 rounded-xl bg-primary/20 text-primary font-medium"
                    >
                      <Search className="h-4 w-4" />
                      Ver todos os resultados para "{query}"
                    </button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">Nenhum resultado encontrado</p>
                    <p className="text-white/30 text-sm mt-1">Tente buscar por outro termo</p>
                  </div>
                )}
              </div>
            ) : (
              // Suggestions
              <div className="space-y-6">
                {/* Recent Searches */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-white/50" />
                    <p className="text-white/50 text-sm font-medium">Buscas recentes</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        onClick={() => handleSearch(search)}
                        className="px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <p className="text-white/50 text-sm font-medium">Em alta</p>
                  </div>
                  <div className="space-y-1">
                    {trendingSearches.map((search, index) => (
                      <button
                        key={search}
                        onClick={() => handleSearch(search)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                      >
                        <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="text-white">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick filters */}
                <div>
                  <p className="text-white/50 text-sm font-medium mb-3">Explorar por</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => navigate("/eventos")}
                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-left"
                    >
                      <Calendar className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-white font-medium">Eventos</p>
                        <p className="text-white/50 text-xs">Ver todos</p>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate("/explorar-organizadores")}
                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 text-left"
                    >
                      <User className="h-6 w-6 text-accent" />
                      <div>
                        <p className="text-white font-medium">Organizadores</p>
                        <p className="text-white/50 text-xs">Descobrir</p>
                      </div>
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
