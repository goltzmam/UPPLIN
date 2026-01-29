import { forwardRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MapPin, Bookmark, User, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/hooks/use-haptic";
import { FeedSearch } from "@/components/feed/FeedSearch";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  isCity?: boolean;
}

export const BottomNav = forwardRef<HTMLElement, object>(function BottomNav(_, ref) {
  const location = useLocation();
  const { user } = useAuth();
  const [cityName] = useState("Por perto");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Participants see: Home, City, Search, Saved, Profile (no "Criar" button)
  const navItems: NavItem[] = [
    { icon: Home, label: "Início", path: "/" },
    { icon: MapPin, label: cityName, path: "#", isCity: true },
    { icon: Search, label: "Buscar", path: "/eventos" },
    { icon: Bookmark, label: "Salvos", path: "/eventos-salvos", requiresAuth: true },
    { icon: User, label: "Perfil", path: user ? "/perfil" : "/login" },
  ];

  // Only hide on checkout, organizer dashboard, and admin pages
  const hiddenPaths = ["/checkout", "/organizador/dashboard", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  return (
    <motion.nav
      ref={ref as React.Ref<HTMLElement>}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden print:hidden"
    >
      {/* Subtle shadow for elegant separation */}
      <div className="absolute inset-x-0 -top-4 h-8 bg-gradient-to-t from-foreground/5 to-transparent pointer-events-none" />

      {/* Background bar with shadow */}
      <div className="absolute inset-0 bg-background shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] border-t border-border" />

      {/* Content */}
      <div className="relative px-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isCity) {
              return (
                <button
                  key="city-selector"
                  onClick={() => {
                    triggerHaptic('selection');
                    setIsSearchOpen(true);
                  }}
                  className="relative flex flex-col items-center justify-center py-1 px-4"
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                  </motion.div>
                  
                  <span className="text-[10px] font-medium mt-1 text-foreground">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.requiresAuth && !user ? "/login" : item.path}
                onClick={() => triggerHaptic('selection')}
                className="relative flex flex-col items-center justify-center py-1 px-4"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                </motion.div>
                
                <span className="text-[10px] font-medium mt-1 text-foreground">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search Overlay */}
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </motion.nav>
  );
});

BottomNav.displayName = "BottomNav";
