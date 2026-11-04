import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Ticket, Bookmark, Users, RefreshCw, Search, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { FeedSearch } from "@/components/feed/FeedSearch";

interface HeaderProps {
  showSearch?: boolean;
  onSearchVisible?: (visible: boolean) => void;
  minimal?: boolean;
}

export function Header({ minimal = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, profile } = useAuth();
  const { logout, loggingOut } = useLogout({ redirectTo: "/" });
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Track scroll position for header transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = () => logout({ redirectTo: "/" });
  const handleSwitchAccount = () => logout({ redirectTo: "/login", showToast: false });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 pt-[var(--safe-top)] transition-all duration-300 ease-out",
        isScrolled 
          ? "bg-black/95 backdrop-blur-xl border-b border-border/50 shadow-lg" 
          : "bg-black border-b border-border/30"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-14">
          {/* Logo with gradient text */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-display text-xl font-bold tracking-tight"
              style={{ 
                background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              UPPLIN
            </motion.div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/eventos" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all hover:bg-muted",
                location.pathname === "/eventos" && "bg-muted text-foreground"
              )}
            >
              Explorar
            </Link>
            <Link 
              to="/explorar-organizadores" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all hover:bg-muted flex items-center gap-1.5",
                location.pathname === "/explorar-organizadores" && "bg-muted text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Organizadores
            </Link>

            <div className="w-px h-5 bg-border/50 mx-3" />

            {/* Search button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <NotificationCenter />

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-muted">
                      <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                        <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name || "User"} />
                        <AvatarFallback className="bg-foreground text-background text-sm font-medium">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" forceMount sideOffset={8}>
                    {/* User Info Header */}
                    <div className="flex items-center gap-3 p-3 border-b border-border">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile?.photo_url || undefined} />
                        <AvatarFallback className="bg-foreground text-background text-lg">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        {profile?.full_name && (
                          <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.email}
                        </p>
                      </div>
                    </div>
                    
                    {/* Quick Links */}
                    <div className="p-1.5">
                      <DropdownMenuItem 
                        onClick={() => navigate("/eventos")}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <span className="font-medium">Explorar Eventos</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator />
                    
                    {/* Account Section */}
                    <div className="p-1.5">
                      <DropdownMenuItem 
                        onClick={() => navigate("/perfil")}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        Meu Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/meus-ingressos")}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <Ticket className="mr-2 h-4 w-4 text-muted-foreground" />
                        Meus Ingressos
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/eventos-salvos")}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <Bookmark className="mr-2 h-4 w-4 text-muted-foreground" />
                        Eventos Salvos
                      </DropdownMenuItem>
                    </div>
                    
                    <DropdownMenuSeparator />

                    {/* Become / access organizer */}
                    <div className="p-1.5">
                      <DropdownMenuItem
                        onClick={() => navigate("/organizador/cadastro")}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <Building2 className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium">Tornar-se organizador</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator />
                    
                    {/* Switch Account & Logout */}
                    <div className="p-1.5">
                      <DropdownMenuItem 
                        onClick={handleSwitchAccount} 
                        disabled={loggingOut}
                        className="rounded-lg py-2.5 cursor-pointer"
                      >
                        <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
                        Trocar Conta
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleSignOut} 
                        disabled={loggingOut}
                        className="rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {loggingOut ? "Saindo..." : "Sair"}
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/login")}
                  className="rounded-full"
                >
                  Entrar
                </Button>
                <Button 
                  onClick={() => navigate("/cadastro")}
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                >
                  Criar Conta
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile: Search + Notification/Menu */}
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            {user ? (
              <NotificationCenter />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Only for non-logged users */}
      <AnimatePresence>
        {mobileMenuOpen && !user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border overflow-hidden"
          >
            <nav className="container py-4 flex flex-col gap-1">
              <Link
                to="/eventos"
                className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explorar Eventos
              </Link>
              <Link
                to="/explorar-organizadores"
                className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ver Organizadores
              </Link>
              <div className="h-px bg-border my-2" />
              <div className="flex flex-col gap-2 p-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => {
                    navigate("/cadastro");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  Criar Conta
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    {/* Search Overlay */}
    <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
