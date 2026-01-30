import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  MapPin,
  Bookmark,
  User,
  LogOut,
  LogIn,
  UserPlus,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { UpActionMenu } from "@/components/navigation/UpActionMenu";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, isActive, onClick }: NavItemProps) => {
  const content = (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
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
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1 py-3 group"
      >
        {content}
        <span className={cn(
          "text-[10px] font-medium transition-colors",
          isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
        )}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <Link
      to={to || "/"}
      className="flex flex-col items-center gap-1 py-3 group"
    >
      {content}
      <span className={cn(
        "text-[10px] font-medium transition-colors",
        isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
      )}>
        {label}
      </span>
    </Link>
  );
};

// UP Button matching mobile style
const UpButtonDesktop = ({ onClick }: { onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    className="relative flex flex-col items-center justify-center py-3 group"
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
  >
    {/* Subtle pulse glow effect */}
    <motion.div
      className="absolute rounded-full"
      style={{
        background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
        filter: "blur(8px)",
        width: "32px",
        height: "32px",
      }}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* Main button */}
    <motion.div
      className="relative h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
        boxShadow: "0 0 12px rgba(255, 45, 45, 0.5)",
      }}
    >
      <ArrowUp className="text-white" strokeWidth={2.5} size={18} />
    </motion.div>
    
    <span className="text-[10px] font-medium mt-1 text-sidebar-foreground/70 flex items-center gap-0.5">
      UP <Sparkles className="h-2.5 w-2.5" />
    </span>
  </motion.button>
);

export function TikTokDesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpMenuOpen, setIsUpMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 flex-col items-center h-dvh w-[72px] py-4 z-40 bg-sidebar border-r border-sidebar-border">
        {/* Logo - "UP" matching mobile branding */}
        <Link to="/" className="mb-4 shrink-0">
          <span 
            className="font-display text-2xl font-bold"
            style={{ 
              background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >UP</span>
        </Link>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-0.5">
          {/* Início */}
          <NavItem
            to="/"
            icon={<Home className="h-5 w-5" strokeWidth={1.5} />}
            label="Início"
            isActive={isActive("/")}
          />

          {/* Por perto (search trigger) - same as mobile */}
          <NavItem
            icon={<MapPin className="h-5 w-5" strokeWidth={1.5} />}
            label="Por perto"
            onClick={() => setIsSearchOpen(true)}
          />
          
          {/* UP Button - Central CTA */}
          <UpButtonDesktop onClick={() => setIsUpMenuOpen(true)} />
          
          {/* Salvos */}
          <NavItem
            to={user ? "/eventos-salvos" : "/login"}
            icon={<Bookmark className="h-5 w-5" strokeWidth={1.5} />}
            label="Salvos"
            isActive={isActive("/eventos-salvos")}
          />

          {/* Perfil */}
          <NavItem
            to={user ? "/perfil" : "/login"}
            icon={<User className="h-5 w-5" strokeWidth={1.5} />}
            label="Perfil"
            isActive={isActive("/perfil")}
          />
        </nav>

        {/* Bottom actions - Auth - Always visible */}
        <div className="flex flex-col items-center gap-0.5 pt-3 mt-auto border-t border-sidebar-border shrink-0">
          {user ? (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 py-2 group"
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-sidebar-accent/60 transition-colors"
              >
                <LogOut className="h-5 w-5 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70" strokeWidth={1.5} />
              </motion.div>
              <span className="text-[10px] font-medium text-sidebar-foreground/40">Sair</span>
            </button>
          ) : (
              <NavItem
                to="/login"
                icon={<LogIn className="h-5 w-5" strokeWidth={1.5} />}
                label="Entrar"
                isActive={isActive("/login")}
              />
          )}
        </div>
      </aside>

      {/* Search overlay */}
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* UP Action Menu */}
      <UpActionMenu isOpen={isUpMenuOpen} onClose={() => setIsUpMenuOpen(false)} />
    </>
  );
}
