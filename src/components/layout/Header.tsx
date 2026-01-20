import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Ticket, MessageCircle, Settings, Users, Bookmark, Building2, ChevronRight } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface HeaderProps {
  showSearch?: boolean;
  onSearchVisible?: (visible: boolean) => void;
  minimal?: boolean;
}

export function Header({ minimal = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, profile, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
        isScrolled 
          ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm" 
          : "bg-background border-b border-border/30"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-display text-xl font-bold tracking-tight text-foreground"
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
            <Link 
              to="/organizadores" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all hover:bg-muted",
                location.pathname === "/organizadores" && "bg-muted text-foreground"
              )}
            >
              Para Organizadores
            </Link>

            <div className="w-px h-5 bg-border/50 mx-3" />

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
                      <DropdownMenuItem 
                        onClick={() => navigate("/organizadores")}
                        className="rounded-lg py-2.5 cursor-pointer bg-muted"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="font-medium">Para Organizadores</span>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
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
                    
                    {/* Logout */}
                    <div className="p-1.5">
                      <DropdownMenuItem 
                        onClick={handleSignOut} 
                        className="rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
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

          {/* Mobile: Notification only for logged users, Menu for non-logged */}
          <div className="flex items-center gap-2 md:hidden">
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
                to="/organizadores"
                className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Para Organizadores
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
  );
}
