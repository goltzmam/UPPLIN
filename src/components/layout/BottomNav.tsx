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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Fully transparent background with subtle blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      
      {/* Subtle top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/30" />
      
      {/* Safe area padding for iOS */}
      <div className="relative px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
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
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent via-pink-500 to-orange-400 rounded-2xl blur-lg opacity-60" />
                    
                    {/* Button */}
                    <div className="relative bg-gradient-to-r from-accent via-pink-500 to-orange-400 rounded-2xl p-3 shadow-lg shadow-accent/30">
                      <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
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
                className="relative flex flex-col items-center justify-center py-1 px-3 group"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative"
                >
                  <Icon 
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      isActive 
                        ? "text-foreground" 
                        : "text-muted-foreground",
                      isActive && item.fillOnActive && "fill-current"
                    )} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </motion.div>
                
                <span 
                  className={cn(
                    "text-[10px] font-medium mt-1 transition-colors duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground"
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
