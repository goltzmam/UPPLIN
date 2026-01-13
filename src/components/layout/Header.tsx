import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Calendar, LayoutDashboard, Shield, Search, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface HeaderProps {
  showSearch?: boolean;
  onSearchVisible?: (visible: boolean) => void;
}

export function Header({ showSearch = false, onSearchVisible }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 400;
      setIsScrolled(scrolled);
      onSearchVisible?.(scrolled);
    };

    if (isHome && showSearch) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [isHome, showSearch, onSearchVisible]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled || !isHome
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container">
        <div className={cn(
          "flex items-center justify-between transition-all duration-300",
          isScrolled ? "h-16" : "h-20"
        )}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className={cn(
                "flex items-center justify-center rounded-2xl transition-all duration-300",
                isScrolled || !isHome
                  ? "h-10 w-10 bg-primary"
                  : "h-12 w-12 bg-white/10 backdrop-blur-sm border border-white/20"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar className={cn(
                "transition-all duration-300",
                isScrolled || !isHome
                  ? "h-5 w-5 text-primary-foreground"
                  : "h-6 w-6 text-white"
              )} />
            </motion.div>
            <span className={cn(
              "font-display text-xl font-bold transition-colors duration-300",
              isScrolled || !isHome ? "text-foreground" : "text-white"
            )}>
              Influente
            </span>
          </Link>

          {/* Center - Compact Search (appears on scroll) */}
          <AnimatePresence>
            {(isScrolled && isHome && showSearch) && (
              <motion.form
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                onSubmit={handleSearch}
                className="hidden md:flex items-center gap-2 bg-muted/80 backdrop-blur rounded-full px-4 py-2 border border-border/50"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-40 placeholder:text-muted-foreground"
                />
                <div className="w-px h-4 bg-border" />
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Localização"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-24 placeholder:text-muted-foreground"
                />
                <Button type="submit" size="sm" className="rounded-full h-8 px-4">
                  Buscar
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/eventos" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 hover:bg-white/10",
                isScrolled || !isHome 
                  ? "text-foreground hover:bg-muted" 
                  : "text-white/90 hover:text-white"
              )}
            >
              Explorar
            </Link>
            <Link 
              to="/organizadores" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 hover:bg-white/10",
                isScrolled || !isHome 
                  ? "text-foreground hover:bg-muted" 
                  : "text-white/90 hover:text-white"
              )}
            >
              Para Organizadores
            </Link>
            <Link 
              to="/precos" 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 hover:bg-white/10",
                isScrolled || !isHome 
                  ? "text-foreground hover:bg-muted" 
                  : "text-white/90 hover:text-white"
              )}
            >
              Preços
            </Link>

            <div className="w-px h-6 bg-border/50 mx-2" />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 ring-2 ring-white/20">
                      <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {profile?.full_name && (
                        <p className="font-medium">{profile.full_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
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
                    <Calendar className="mr-2 h-4 w-4" />
                    Meus Ingressos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/organizador")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Área do Organizador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/login")}
                  className={cn(
                    "rounded-full",
                    isScrolled || !isHome ? "" : "text-white hover:bg-white/10"
                  )}
                >
                  Entrar
                </Button>
                <Button 
                  onClick={() => navigate("/cadastro")}
                  className={cn(
                    "rounded-full",
                    isScrolled || !isHome ? "" : "bg-white text-secondary hover:bg-white/90"
                  )}
                >
                  Começar Grátis
                </Button>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden rounded-full",
              isScrolled || !isHome ? "" : "text-white hover:bg-white/10"
            )}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <nav className="container py-4 px-4 flex flex-col gap-1">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar eventos..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                  />
                  <Button type="submit" size="sm" className="rounded-lg h-8">
                    Buscar
                  </Button>
                </div>
              </form>

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
              <Link
                to="/precos"
                className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Preços
              </Link>
              
              {user ? (
                <>
                  <div className="h-px bg-border my-2" />
                  <Link
                    to="/perfil"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                  <Link
                    to="/meus-ingressos"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Calendar className="h-4 w-4" />
                    Meus Ingressos
                  </Link>
                  <Link
                    to="/organizador"
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Área do Organizador
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-base font-medium hover:bg-muted rounded-xl transition-colors flex items-center gap-3 text-destructive w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
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
                      className="w-full rounded-xl"
                    >
                      Começar Grátis
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
