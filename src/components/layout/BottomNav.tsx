import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MapPin, Bookmark, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/hooks/use-haptic";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { UpButton } from "@/components/navigation/UpButton";
import { UpActionMenu } from "@/components/navigation/UpActionMenu";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  isCity?: boolean;
  isUpButton?: boolean;
}

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [cityName] = useState("Por perto");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpMenuOpen, setIsUpMenuOpen] = useState(false);

  // Navigation items with central UP button
  const navItems: NavItem[] = [
    { icon: Home, label: "Início", path: "/" },
    { icon: MapPin, label: cityName, path: "#", isCity: true },
    { icon: Home, label: "UP", path: "#", isUpButton: true },
    { icon: Bookmark, label: "Salvos", path: "/eventos-salvos", requiresAuth: true },
    { icon: User, label: "Perfil", path: user ? "/perfil" : "/login" },
  ];

  // Only hide on checkout, organizer dashboard, and admin pages
  const hiddenPaths = ["/checkout", "/organizador/dashboard", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  return (
    <>
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden print:hidden"
      >
        {/* Subtle shadow for elegant separation */}
        <div className="absolute inset-x-0 -top-4 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Background bar - dark premium */}
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl border-t border-border/50" />

        {/* Content */}
        <div className="relative px-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;

              // City selector button
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
                    <Icon className="h-6 w-6 text-white/70" strokeWidth={1.5} />
                  </motion.div>
                  
                  <span className="text-[10px] font-medium mt-1 text-white/70">
                    {item.label}
                  </span>
                </button>
                );
              }

              // Central UP button with neon gradient - same height as others
              if (item.isUpButton) {
                return (
                  <div key="up-button" className="relative flex flex-col items-center justify-center py-1 px-4">
                    <UpButton onClick={() => setIsUpMenuOpen(true)} />
                  </div>
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
                    <Icon className="h-6 w-6 text-white/70" strokeWidth={1.5} />
                  </motion.div>
                  
                  <span className="text-[10px] font-medium mt-1 text-white/70">
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

      {/* UP Action Menu */}
      <UpActionMenu isOpen={isUpMenuOpen} onClose={() => setIsUpMenuOpen(false)} />
    </>
  );
}
