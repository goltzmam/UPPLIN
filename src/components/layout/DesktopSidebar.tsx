import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Compass,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Menu,
  Ticket,
  Bookmark,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

const NavItem = ({ to, icon, label, isActive }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-4 px-3 py-3 rounded-lg transition-all group",
      isActive
        ? "font-semibold"
        : "text-foreground/80 hover:bg-muted"
    )}
  >
    <span className={cn(
      "transition-transform group-hover:scale-110",
      isActive && "scale-110"
    )}>
      {icon}
    </span>
    <span className="hidden xl:block">{label}</span>
  </Link>
);

export function DesktopSidebar() {
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
    <aside className="hidden md:flex flex-col w-[72px] xl:w-[244px] h-screen border-r border-border/50 px-3 py-6 sticky top-0 shrink-0">
      {/* Logo */}
      <Link to="/" className="px-3 py-4 mb-4">
        <span className="hidden xl:block font-display text-2xl font-bold">UPPLIN</span>
        <span className="xl:hidden font-display text-xl font-bold">U</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        <NavItem
          to="/"
          icon={<Home className={cn("h-6 w-6", isActive("/") && "fill-current")} />}
          label="Início"
          isActive={isActive("/")}
        />
        <NavItem
          to="/eventos"
          icon={<Compass className="h-6 w-6" />}
          label="Explorar"
          isActive={isActive("/eventos")}
        />
        <NavItem
          to="/mensagens"
          icon={<MessageCircle className="h-6 w-6" />}
          label="Mensagens"
          isActive={isActive("/mensagens")}
        />
        <NavItem
          to="/perfil"
          icon={<Heart className="h-6 w-6" />}
          label="Notificações"
          isActive={false}
        />
        
        {user && (
          <>
            <NavItem
              to="/organizador/evento"
              icon={<PlusSquare className="h-6 w-6" />}
              label="Criar"
              isActive={isActive("/organizador/evento")}
            />
            <NavItem
              to="/meus-ingressos"
              icon={<Ticket className="h-6 w-6" />}
              label="Ingressos"
              isActive={isActive("/meus-ingressos")}
            />
            <NavItem
              to="/eventos-salvos"
              icon={<Bookmark className="h-6 w-6" />}
              label="Salvos"
              isActive={isActive("/eventos-salvos")}
            />
          </>
        )}
      </nav>

      {/* Profile / Login */}
      <div className="mt-auto pt-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted transition-all w-full text-left">
                <div className="h-7 w-7 rounded-full bg-muted overflow-hidden ring-2 ring-border">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Perfil" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent to-pink-500 text-white text-xs font-bold">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <span className="hidden xl:block text-sm font-medium truncate max-w-[140px]">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <Menu className="h-4 w-4 ml-auto hidden xl:block text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/meus-ingressos")}>
                <Ticket className="h-4 w-4 mr-2" />
                Meus Ingressos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/eventos-salvos")}>
                <Bookmark className="h-4 w-4 mr-2" />
                Eventos Salvos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted transition-all"
          >
            <User className="h-6 w-6" />
            <span className="hidden xl:block text-sm font-medium">Entrar</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
