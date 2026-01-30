import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Bookmark,
  User,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCreate?: boolean;
}

const NavItem = ({ to, icon, label, isActive, isCreate }: NavItemProps) => {
  if (isCreate) {
    return (
      <Link to={to} className="flex flex-col items-center gap-1 my-2">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative"
        >
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)" }}
          >
            <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 py-3 group"
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
          isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
        )}
      >
        <span className={cn(
          "transition-colors",
          isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80"
        )}>
          {icon}
        </span>
      </motion.div>
      <span className={cn(
        "text-[10px] font-medium transition-colors",
        isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
      )}>
        {label}
      </span>
    </Link>
  );
};

export function TikTokDesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="hidden lg:flex flex-col items-center h-screen w-[72px] py-4 shrink-0 z-40 bg-sidebar border-r border-sidebar-border">
      {/* Logo - just "U" on desktop */}
      <Link to="/" className="mb-8">
        <span 
          className="font-display text-3xl font-bold"
          style={{ 
            background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >UP</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        <NavItem
          to="/"
          icon={<Home className="h-5 w-5" strokeWidth={1.5} />}
          label="Início"
          isActive={isActive("/")}
        />
        <NavItem
          to="/eventos"
          icon={<Search className="h-5 w-5" strokeWidth={1.5} />}
          label="Explorar"
          isActive={isActive("/eventos")}
        />
        
        <NavItem
          to={user ? "/organizador/evento" : "/organizador/cadastro"}
          icon={<Plus className="h-5 w-5" />}
          label="Criar"
          isCreate
        />
        
        <NavItem
          to={user ? "/eventos-salvos" : "/login"}
          icon={<Bookmark className="h-5 w-5" strokeWidth={1.5} />}
          label="Salvos"
          isActive={isActive("/eventos-salvos")}
        />
        <NavItem
          to={user ? "/perfil" : "/login"}
          icon={<User className="h-5 w-5" strokeWidth={1.5} />}
          label="Perfil"
          isActive={isActive("/perfil")}
        />
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-sidebar-border">
        {user && (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 py-2 group"
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-sidebar-accent/60 transition-colors">
              <LogOut className="h-5 w-5 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-sidebar-foreground/40">Sair</span>
          </button>
        )}
      </div>
    </aside>
  );
}
