import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/events/FollowButton";
import { 
  Search, 
  Users, 
  Calendar, 
  Music,
  PartyPopper,
  Theater,
  Trophy,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Organizer {
  id: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  slug: string | null;
  social_instagram: string | null;
  _count: {
    events: number;
    followers: number;
  };
}

const categories = [
  { id: "all", name: "Todos", icon: Sparkles },
  { id: "music", name: "Música", icon: Music },
  { id: "party", name: "Festas", icon: PartyPopper },
  { id: "theater", name: "Teatro", icon: Theater },
  { id: "sports", name: "Esportes", icon: Trophy },
];

export default function ExplorarOrganizadores() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch organizers with event and follower counts
  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["explore-organizers", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("organizer_accounts")
        .select(`
          id,
          display_name,
          description,
          logo_url,
          slug,
          social_instagram
        `)
        .eq("status", "active");

      if (searchQuery.trim()) {
        query = query.ilike("display_name", `%${searchQuery}%`);
      }

      const { data: organizerData, error } = await query.limit(50);
      if (error) throw error;

      // Get counts for each organizer
      const organizersWithCounts = await Promise.all(
        (organizerData || []).map(async (org) => {
          // Get event count
          const { count: eventCount } = await supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("organizer_id", org.id)
            .eq("status", "published");

          // Get follower count
          const { count: followerCount } = await supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("organizer_id", org.id);

          return {
            ...org,
            _count: {
              events: eventCount || 0,
              followers: followerCount || 0,
            },
          };
        })
      );

      // Sort by followers + events
      return organizersWithCounts.sort(
        (a, b) =>
          b._count.followers + b._count.events - (a._count.followers + a._count.events)
      );
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <TikTokDesktopSidebar />

      {/* Main Content - offset for fixed sidebar on desktop */}
      <main className="min-w-0 pb-24 lg:pb-8 lg:ml-[72px]">
        {/* Hero */}
        <section className="py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-muted/50 to-transparent">
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl mx-auto mb-5 sm:mb-6"
            >
              <h1 className="font-display text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2">
                Descubra <span className="gradient-text">Organizadores</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground px-4">
                Siga seus produtores favoritos e seja o primeiro a saber sobre novos eventos
              </p>
            </motion.div>

            {/* Search */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar organizadores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 sm:pl-12 pr-4 h-10 sm:h-11 rounded-full text-sm border-border focus:border-transparent focus:ring-2 focus:ring-accent bg-muted/60"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b border-border sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3 -mx-3 sm:-mx-4 px-3 sm:px-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0",
                    activeCategory === cat.id
                      ? "btn-gradient text-white shadow-md"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <cat.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Organizers Grid */}
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="w-full max-w-6xl mx-auto px-3 sm:px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-card border animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-muted rounded mb-2" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-8 sm:h-9 w-full bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            ) : organizers.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold mb-1 sm:mb-2">
                  Nenhum organizador encontrado
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Tente buscar com outros termos
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {organizers.map((organizer, index) => (
                  <motion.div
                    key={organizer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-card border hover:neon-border hover:shadow-lg transition-all"
                  >
                    <Link
                      to={organizer.slug ? `/o/${organizer.slug}` : `/organizador/${organizer.id}`}
                      className="flex items-center gap-3 mb-2 sm:mb-3"
                    >
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-border group-hover:ring-transparent transition-all">
                        <AvatarImage src={organizer.logo_url || undefined} />
                        <AvatarFallback 
                          className="text-white text-xs sm:text-sm font-bold"
                          style={{ background: "var(--gradient-upplin)" }}
                        >
                          {getInitials(organizer.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-xs sm:text-sm truncate group-hover:gradient-text transition-colors">
                          {organizer.display_name}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {organizer._count.followers}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {organizer._count.events}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {organizer.description && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                        {organizer.description}
                      </p>
                    )}

                    <FollowButton
                      organizerId={organizer.id}
                      size="sm"
                      className="w-full rounded-full text-xs"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
