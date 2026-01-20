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
      {/* TikTok-style overlay: dark gradient over video (no solid bar) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* No blur here (blur can turn into a white/gray bar on light pages). */}
        <div className="absolute inset-0 bg-gradient-to-t from-video-overlay/90 via-video-overlay/40 to-transparent" />
      </div>

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
                  className="relative flex items-center justify-center -mt-5"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    className="relative"
                  >
                    {/* Pill button (TikTok-like) */}
                    <div className="relative h-11 w-[70px] rounded-2xl overflow-hidden shadow-xl">
                      <div className="absolute inset-y-0 left-0 w-4 bg-accent" />
                      <div className="absolute inset-y-0 right-0 w-4 bg-destructive" />
                      <div className="absolute inset-0 mx-2 rounded-2xl bg-primary-foreground flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" strokeWidth={3} />
                      </div>
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
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
