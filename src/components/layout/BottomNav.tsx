import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Bookmark, User, Plus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab?: "foryou" | "following";
  onTabChange?: (tab: "foryou" | "following") => void;
}

export function BottomNav({ activeTab = "foryou", onTabChange }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only hide on checkout, organizer dashboard, and admin pages
  const hiddenPaths = ["/checkout", "/organizador/dashboard", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) return null;

  const isHomePage = location.pathname === "/";

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
      <div className="relative px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+6px)]">
        {/* Feed Tabs - Only show on homepage */}
        {isHomePage && (
          <div className="flex items-center justify-center gap-6 mb-2 pt-1">
            <button
              onClick={() => {
                triggerHaptic('selection');
                onTabChange?.("foryou");
              }}
              className={cn(
                "relative py-1 text-xs font-semibold transition-all",
                activeTab === "foryou" ? "text-black" : "text-black/40"
              )}
            >
              Para você
              {activeTab === "foryou" && (
                <motion.div
                  layoutId="tab-underline-nav"
                  className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                onTabChange?.("following");
              }}
              className={cn(
                "relative py-1 text-xs font-semibold transition-all",
                activeTab === "following" ? "text-black" : "text-black/40"
              )}
            >
              Seguindo
              {activeTab === "following" && (
                <motion.div
                  layoutId="tab-underline-nav"
                  className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          </div>
        )}

        {/* Navigation Icons */}
        <div className="flex items-center justify-around">
          {/* Home */}
          <Link
            to="/"
            onClick={() => triggerHaptic('selection')}
            className="relative flex flex-col items-center justify-center py-1 px-4"
          >
            <motion.div whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Home className={cn("h-6 w-6", location.pathname === "/" ? "text-primary" : "text-black")} strokeWidth={1.5} />
            </motion.div>
            <span className={cn("text-[10px] font-medium mt-0.5", location.pathname === "/" ? "text-primary" : "text-black")}>
              Início
            </span>
          </Link>

          {/* Search/Explore */}
          <Link
            to="/eventos"
            onClick={() => triggerHaptic('selection')}
            className="relative flex flex-col items-center justify-center py-1 px-4"
          >
            <motion.div whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Search className={cn("h-6 w-6", location.pathname === "/eventos" ? "text-primary" : "text-black")} strokeWidth={1.5} />
            </motion.div>
            <span className={cn("text-[10px] font-medium mt-0.5", location.pathname === "/eventos" ? "text-primary" : "text-black")}>
              Explorar
            </span>
          </Link>

          {/* Create Button */}
          <Link
            to="/organizador/cadastro"
            onClick={() => triggerHaptic('medium')}
            className="relative flex items-center justify-center -mt-4"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="relative">
              <div 
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{ background: "linear-gradient(135deg, hsl(346 84% 60%), hsl(25 95% 55%))" }}
              />
              <div 
                className="relative rounded-full p-3 shadow-xl"
                style={{ background: "linear-gradient(135deg, hsl(346 84% 60%), hsl(25 95% 55%))" }}
              >
                <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>
          </Link>

          {/* Saved */}
          <Link
            to={user ? "/eventos-salvos" : "/login"}
            onClick={() => triggerHaptic('selection')}
            className="relative flex flex-col items-center justify-center py-1 px-4"
          >
            <motion.div whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Bookmark className={cn("h-6 w-6", location.pathname === "/eventos-salvos" ? "text-primary" : "text-black")} strokeWidth={1.5} />
            </motion.div>
            <span className={cn("text-[10px] font-medium mt-0.5", location.pathname === "/eventos-salvos" ? "text-primary" : "text-black")}>
              Salvos
            </span>
          </Link>

          {/* Profile */}
          <Link
            to={user ? "/perfil" : "/login"}
            onClick={() => triggerHaptic('selection')}
            className="relative flex flex-col items-center justify-center py-1 px-4"
          >
            <motion.div whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <User className={cn("h-6 w-6", location.pathname === "/perfil" ? "text-primary" : "text-black")} strokeWidth={1.5} />
            </motion.div>
            <span className={cn("text-[10px] font-medium mt-0.5", location.pathname === "/perfil" ? "text-primary" : "text-black")}>
              Perfil
            </span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
