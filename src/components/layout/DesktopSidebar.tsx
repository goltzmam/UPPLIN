import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  Bookmark,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const SIDEBAR_COLLAPSED_KEY = "upplin_sidebar_collapsed";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  isCreate?: boolean;
}

const NavItem = ({ to, icon, label, isActive, isCollapsed, isCreate }: NavItemProps) => {
  if (isCreate) {
    return (
      <Link
        to={to}
        className="flex items-center justify-center my-2"
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
            className={cn(
              "relative rounded-full shadow-lg flex items-center justify-center",
              isCollapsed ? "p-3" : "px-4 py-3 gap-2"
            )}
            style={{ background: "linear-gradient(135deg, hsl(346 84% 60%), hsl(25 95% 55%))" }}
          >
            <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            {!isCollapsed && (
              <span className="text-white text-sm font-semibold">Criar</span>
            )}
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
        isCollapsed && "justify-center",
        isActive
          ? "bg-muted font-semibold"
          : "text-foreground/80 hover:bg-muted/50"
      )}
    >
      <motion.span 
        className={cn(
          "transition-transform group-hover:scale-110 shrink-0",
          isActive && "scale-110"
        )}
        whileTap={{ scale: 0.9 }}
      >
        {icon}
      </motion.span>
      {!isCollapsed && (
        <span className="text-sm">{label}</span>
      )}
    </Link>
  );
};

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);
  
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <aside 
      className={cn(
        "hidden lg:flex flex-col h-screen border-r border-border/50 py-6 sticky top-0 shrink-0 transition-all duration-300",
        isCollapsed ? "w-[72px] px-2" : "w-[200px] xl:w-[220px] px-3"
      )}
    >
      {/* Logo + Collapse Toggle */}
      <div className={cn(
        "flex items-center mb-6",
        isCollapsed ? "justify-center" : "justify-between px-3"
      )}>
        <Link to="/" className="flex items-center">
          {isCollapsed ? (
            <span className="font-display text-xl font-bold">U</span>
          ) : (
            <span className="font-display text-xl font-bold">UPPLIN</span>
          )}
        </Link>
        
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapsed expand button */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="flex items-center justify-center p-2 mb-4 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Navigation - Same as BottomNav */}
      <nav className="flex-1 flex flex-col gap-1">
        <NavItem
          to="/"
          icon={<Home className="h-6 w-6" strokeWidth={1.5} />}
          label="Início"
          isActive={isActive("/")}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/eventos"
          icon={<Search className="h-6 w-6" strokeWidth={1.5} />}
          label="Explorar"
          isActive={isActive("/eventos")}
          isCollapsed={isCollapsed}
        />
        
        {/* Create Button - Same gradient style as mobile */}
        <NavItem
          to={user ? "/organizador/painel/evento/novo" : "/organizador/cadastro"}
          icon={<Plus className="h-6 w-6" />}
          label="Criar"
          isActive={false}
          isCollapsed={isCollapsed}
          isCreate
        />
        
        <NavItem
          to={user ? "/eventos-salvos" : "/login"}
          icon={<Bookmark className="h-6 w-6" strokeWidth={1.5} />}
          label="Salvos"
          isActive={isActive("/eventos-salvos")}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to={user ? "/perfil" : "/login"}
          icon={<User className="h-6 w-6" strokeWidth={1.5} />}
          label="Perfil"
          isActive={isActive("/perfil")}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Logout button at bottom for logged in users */}
      {user && (
        <div className="pt-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-muted-foreground hover:bg-muted/50 hover:text-destructive w-full",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            {!isCollapsed && (
              <span className="text-sm">Sair</span>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}