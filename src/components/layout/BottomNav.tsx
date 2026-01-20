import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  requiresAuth?: boolean;
}

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { icon: <Home className="h-6 w-6" />, label: "Início", path: "/" },
    { icon: <Search className="h-6 w-6" />, label: "Explorar", path: "/eventos" },
    { icon: <PlusSquare className="h-6 w-6" />, label: "Criar", path: "/organizador/cadastro" },
    { icon: <Heart className="h-6 w-6" />, label: "Salvos", path: "/perfil?tab=salvos", requiresAuth: true },
    { icon: <User className="h-6 w-6" />, label: "Perfil", path: user ? "/perfil" : "/login" },
  ];

  // Don't show on certain pages
  const hiddenPaths = ["/checkout", "/organizador", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === "/" && location.pathname === "/") ||
            (item.path !== "/" && location.pathname.startsWith(item.path.split("?")[0]));
          
          // Special styling for create button
          const isCreate = item.label === "Criar";

          return (
            <Link
              key={item.path}
              to={item.requiresAuth && !user ? "/login" : item.path}
              className={cn(
                "bottom-nav-item relative",
                isActive && "active",
                isCreate && "relative"
              )}
            >
              {isCreate ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-pink-500 rounded-lg blur-sm opacity-50" />
                  <div className="relative bg-foreground text-background rounded-lg p-1.5">
                    <PlusSquare className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "transition-colors",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                  </motion.div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                  <div className={cn("nav-dot", isActive && "opacity-100")} />
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
