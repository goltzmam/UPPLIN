import { Link, useLocation } from "react-router-dom";
import { Home, Search, Bookmark, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/hooks/use-haptic";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  isCreate?: boolean;
  fillOnActive?: boolean;
}

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { icon: Home, label: "Início", path: "/", fillOnActive: true },
    { icon: Search, label: "Explorar", path: "/eventos", fillOnActive: false },
    { icon: Plus, label: "Criar", path: "/organizador/cadastro", isCreate: true },
    { icon: Bookmark, label: "Salvos", path: "/eventos-salvos", requiresAuth: true, fillOnActive: true },
    { icon: User, label: "Perfil", path: user ? "/perfil" : "/login", fillOnActive: true },
  ];

  // Only hide on checkout, organizer dashboard, and admin pages
  const hiddenPaths = ["/checkout", "/organizador/dashboard", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none"
    >
      {/* TikTok-style bar: dark translucent so icons are always readable */}
      <div className="absolute inset-0 pointer-events-none bg-video-overlay/70 border-t border-primary-foreground/10" />

      {/* Content - pointer events only on children */}
      <div className="relative px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pointer-events-auto">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/" && location.pathname === "/") ||
              (item.path !== "/" && location.pathname.startsWith(item.path.split("?")[0]));
            
            const Icon = item.icon;

            if (item.isCreate) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => triggerHaptic('medium')}
                  className="relative flex items-center justify-center -mt-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    className="relative"
                  >
                    {/* Original circular gradient button */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full blur-xl opacity-70 shadow-glow"
                      style={{ backgroundImage: "var(--gradient-social)" }}
                    />

                    <div
                      className="relative rounded-full p-4 shadow-xl"
                      style={{ backgroundImage: "var(--gradient-social)" }}
                    >
                      <Plus className="h-6 w-6 text-primary-foreground" strokeWidth={3} />
                    </div>
                  </motion.div>
                </Link>
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
                  <Icon 
                    className={cn(
                      "h-7 w-7 transition-all duration-200",
                      isActive
                        ? "text-primary-foreground drop-shadow-lg"
                        : "text-primary-foreground/60",
                      isActive && item.fillOnActive && "fill-primary-foreground"
                    )} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </motion.div>
                
                <span 
                  className={cn(
                    "text-[10px] font-medium mt-1 transition-colors duration-200",
                    isActive ? "text-primary-foreground" : "text-primary-foreground/60"
                  )}
                >
                  {item.label}
                </span>

                {/* Active dot */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 h-1 w-1 rounded-full transition-opacity",
                    isActive ? "bg-primary-foreground opacity-100" : "opacity-0"
                  )}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
