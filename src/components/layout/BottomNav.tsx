import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface NavItem {
  icon: React.ElementType;
  activeIcon?: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  isCreate?: boolean;
}

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Explorar", path: "/eventos" },
    { icon: Plus, label: "Criar", path: "/organizador/cadastro", isCreate: true },
    { icon: Heart, label: "Salvos", path: "/eventos-salvos", requiresAuth: true },
    { icon: User, label: "Perfil", path: user ? "/perfil" : "/login" },
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
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl border-t border-white/10" />
      
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
                className="relative flex flex-col items-center justify-center py-1.5 px-4 group"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative"
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-glow"
                      className="absolute -inset-2 bg-accent/20 rounded-full blur-md"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1 : 1,
                    }}
                    className={cn(
                      "relative transition-colors duration-200",
                      isActive ? "text-foreground" : "text-muted-foreground/70"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-6 w-6 transition-all duration-200",
                        isActive && "fill-foreground"
                      )} 
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />
                  </motion.div>
                </motion.div>
                
                {/* Label with slide up animation */}
                <motion.span 
                  initial={false}
                  animate={{ 
                    opacity: 1,
                    y: 0,
                  }}
                  className={cn(
                    "text-[10px] font-medium mt-0.5 transition-colors duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground/70"
                  )}
                >
                  {item.label}
                </motion.span>
                
                {/* Active dot indicator */}
                <motion.div
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1 : 0,
                    opacity: isActive ? 1 : 0 
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
