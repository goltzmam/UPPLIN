import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Ticket, MessageCircle, Settings, Users, Bookmark } from "lucide-react";
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
          ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-sm" 
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "font-display text-xl font-bold tracking-tight transition-colors duration-300",
                isScrolled ? "text-foreground" : "text-foreground"
              )}
            >
              UPPLIN
            </motion.div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/eventos" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-muted",
                location.pathname === "/eventos" && "bg-muted"
              )}
            >
              Explorar
            </Link>
            <Link 
              to="/explorar-organizadores" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-muted flex items-center gap-1.5",
                location.pathname === "/explorar-organizadores" && "bg-muted"
              )}
            >
              <Users className="h-4 w-4" />
              Organizadores
            </Link>
            <Link 
              to="/organizadores" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-muted",
                location.pathname === "/organizadores" && "bg-muted"
              )}
            >
              Para Organizadores
            </Link>

            <div className="w-px h-6 bg-border mx-2" />

            {user ? (
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <NotificationCenter />

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name || "User"} />
                        <AvatarFallback className="bg-foreground text-background text-sm font-medium">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-3 p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.photo_url || undefined} />
                        <AvatarFallback className="bg-foreground text-background">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5 leading-none">
                        {profile?.full_name && (
                          <p className="font-medium text-sm">{profile.full_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {profile?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/perfil")}>
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/meus-ingressos")}>
                      <Ticket className="mr-2 h-4 w-4" />
                      Meus Ingressos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/eventos-salvos")}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      Eventos Salvos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mensagens")}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Mensagens
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
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

          {/* Mobile: Notification + Menu */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <NotificationCenter />}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
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
              
              {user ? (
                <>
                  <div className="h-px bg-border my-2" />
                  <Link
                    to="/perfil"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    Meu Perfil
                  </Link>
                  <Link
                    to="/meus-ingressos"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Ticket className="h-5 w-5" />
                    Meus Ingressos
                  </Link>
                  <Link
                    to="/eventos-salvos"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bookmark className="h-5 w-5" />
                    Eventos Salvos
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3 text-destructive w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
