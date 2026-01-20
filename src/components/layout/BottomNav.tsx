import { Link, useLocation } from "react-router-dom";
import { Home, Search, Bookmark, User, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/hooks/use-haptic";

interface NavItem {
  icon: React.ElementType;
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
    { icon: Bookmark, label: "Salvos", path: "/eventos-salvos", requiresAuth: true },
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
      {/* Subtle shadow for elegant separation */}
      <div className="absolute inset-x-0 -top-4 h-8 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

      {/* White background bar with shadow */}
      <div className="absolute inset-0 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]" />

      {/* Content */}
      <div className="relative px-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
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
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-full blur-xl opacity-60"
                      style={{ background: "linear-gradient(135deg, hsl(346 84% 60%), hsl(25 95% 55%))" }}
                    />
                    
                    {/* Button */}
                    <div 
                      className="relative rounded-full p-3.5 shadow-xl"
                      style={{ background: "linear-gradient(135deg, hsl(346 84% 60%), hsl(25 95% 55%))" }}
                    >
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
                className="relative flex flex-col items-center justify-center py-1 px-4"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Icon className="h-6 w-6 text-black" strokeWidth={1.5} />
                </motion.div>
                
                <span className="text-[10px] font-medium mt-1 text-black">
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
