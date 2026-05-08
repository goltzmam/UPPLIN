import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MapPin, Bookmark, User, ArrowUp, LayoutDashboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { UpActionMenu } from "@/components/navigation/UpActionMenu";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}

const NavItem = ({
  to,
  icon,
  label,
  isActive,
  onClick,
  highlight
}: NavItemProps) => {
  const content = <motion.div whileHover={{
    scale: 1.05
  }} whileTap={{
    scale: 0.95
  }} className={cn(
    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
    highlight ? "bg-gradient-to-br from-[#FF6A00] to-[#FF007A]" : isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
  )}>
      <span className={cn(
        "transition-colors",
        highlight ? "text-white" : isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80"
      )}>
        {icon}
      </span>
    </motion.div>;
  if (onClick) {
    return <button onClick={onClick} className="flex flex-col items-center gap-1 py-3 group">
        {content}
        <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70")}>
          {label}
        </span>
      </button>;
  }
  return <Link to={to || "/"} className="flex flex-col items-center gap-1 py-3 group">
      {content}
      <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70")}>
        {label}
      </span>
    </Link>;
};

// UP Button matching mobile style
const UpButtonDesktop = ({
  onClick
}: {
  onClick: () => void;
}) => <motion.button onClick={onClick} className="relative flex flex-col items-center justify-center py-3 group" whileTap={{
  scale: 0.9
}} whileHover={{
  scale: 1.05
}} transition={{
  type: "spring",
  stiffness: 400,
  damping: 17
}}>
    {/* Subtle pulse glow effect */}
    <motion.div className="absolute rounded-full" style={{
    background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
    filter: "blur(8px)",
    width: "32px",
    height: "32px"
  }} animate={{
    scale: [1, 1.15, 1],
    opacity: [0.3, 0.5, 0.3]
  }} transition={{
    duration: 2.5,
    repeat: Infinity,
    ease: "easeInOut"
  }} />

    {/* Main button */}
    <motion.div className="relative h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden" style={{
    background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
    boxShadow: "0 0 12px rgba(255, 45, 45, 0.5)"
  }}>
      <ArrowUp className="text-white" strokeWidth={2.5} size={18} />
    </motion.div>
    
    <span className="text-[10px] font-medium mt-1 text-sidebar-foreground/70 flex items-center gap-0.5">
      UP 
    </span>
  </motion.button>;
export function TikTokDesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOrganizer, isAdmin, organizerId, isLoading: rolesLoading } = useUserRoles();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpMenuOpen, setIsUpMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // REGRA DE NEGÓCIO:
  // - Admin NUNCA vê botão "Painel" do organizador (mesmo se tiver conta)
  // - Admin só vê botão "Admin"
  // - Organizador (não-admin) vê apenas "Painel"
  const showAdminButton = !rolesLoading && isAdmin;
  const showOrganizerButton = !rolesLoading && !isAdmin && isOrganizer && !!organizerId;

  return (
    <>
      <aside className="desktop-sidebar-only fixed left-0 top-0 h-dvh w-[72px] z-40 bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Logo - "UP" matching mobile branding */}
        <div className="flex-shrink-0 flex items-center justify-center py-5">
          <Link to="/">
            <span 
              className="font-display text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              UP
            </span>
          </Link>
        </div>

        {/* Main Navigation - Fixed layout, no scroll */}
        <nav className="flex-1 flex flex-col items-center justify-center gap-1">
          <NavItem 
            to="/" 
            icon={<Home className="h-5 w-5" strokeWidth={1.5} />} 
            label="Início" 
            isActive={isActive("/")} 
          />

          

          <NavItem 
            to="/por-perto"
            icon={<MapPin className="h-5 w-5" strokeWidth={1.5} />} 
            label="Por perto" 
            isActive={isActive("/por-perto")}
          />
          
          {/* UP Button - Central CTA */}
          <UpButtonDesktop onClick={() => setIsUpMenuOpen(true)} />
          
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
        
        {/* Bottom section - Role-specific (only ONE button max) */}
        {(showAdminButton || showOrganizerButton) && (
          <div className="flex-shrink-0 flex flex-col items-center py-4 border-t border-sidebar-border">
            {showAdminButton && (
              <NavItem 
                to="/admin" 
                icon={<LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />} 
                label="Admin" 
                isActive={isActive("/admin")}
                highlight
              />
            )}
            
            {showOrganizerButton && (
              <NavItem 
                to="/organizador/painel" 
                icon={<LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />} 
                label="Painel" 
                isActive={isActive("/organizador/painel")}
                highlight
              />
            )}
          </div>
        )}
      </aside>

      {/* Search overlay */}
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* UP Action Menu */}
      <UpActionMenu isOpen={isUpMenuOpen} onClose={() => setIsUpMenuOpen(false)} />
    </>
  );
}
