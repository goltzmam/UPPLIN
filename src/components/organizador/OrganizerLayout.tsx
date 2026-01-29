import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  Tag, 
  QrCode, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X,
  Plus,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const SIDEBAR_COLLAPSED_KEY = "upplin_org_sidebar_collapsed";

const navItems = [
  { href: "/organizador", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/organizador/eventos", label: "Meus Eventos", icon: Calendar },
  { href: "/organizador/cupons", label: "Cupons", icon: Tag },
  { href: "/organizador/check-in", label: "Check-in", icon: QrCode },
  { href: "/organizador/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/organizador/configuracoes", label: "Configurações", icon: Settings },
];

interface NavItemProps {
  item: typeof navItems[0];
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

const NavItem = ({ item, isActive, isCollapsed, onClick }: NavItemProps) => (
  <Link
    to={item.href}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
      isCollapsed && "justify-center",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
    {!isCollapsed && (
      <span className="text-sm font-medium">{item.label}</span>
    )}
  </Link>
);

export function OrganizerLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Check organizer status
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["organizer-account", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !authLoading,
  });

  useEffect(() => {
    if (authLoading || orgLoading) return;

    if (!user) {
      navigate("/organizador/login", { 
        replace: true, 
        state: { from: location.pathname } 
      });
      return;
    }

    if (!organizer) {
      navigate("/organizador/onboarding", { replace: true });
      return;
    }

    if (organizer.status === "suspended") {
      navigate("/organizador/login", { 
        replace: true,
        state: { suspended: true }
      });
      return;
    }

    setChecking(false);
  }, [user, authLoading, orgLoading, organizer, navigate, location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/organizador/login");
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  if (authLoading || orgLoading || checking) {
    return <PageLoading />;
  }

  if (!user || !organizer) {
    return null;
  }

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center mb-8",
        isCollapsed ? "justify-center" : "justify-between px-3"
      )}>
        <Link to="/" className="flex items-center gap-2">
          <span 
            className={cn(
              "font-display font-bold",
              isCollapsed ? "text-2xl" : "text-xl"
            )}
            style={{ 
              background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            {isCollapsed ? "U" : "UPPLIN"}
          </span>
        </Link>
        
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hidden lg:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-2 mb-4 rounded-lg hover:bg-muted transition-colors text-muted-foreground hidden lg:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Create Event Button */}
      <Link
        to="/organizador/evento/novo"
        onClick={onItemClick}
        className={cn(
          "flex items-center gap-2 mb-6 rounded-xl shadow-lg",
          isCollapsed ? "justify-center p-3" : "px-4 py-3"
        )}
        style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
      >
        <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
        {!isCollapsed && (
          <span className="text-white font-semibold text-sm">Criar Evento</span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item.href, item.exact)}
            isCollapsed={isCollapsed}
            onClick={onItemClick}
          />
        ))}
      </nav>

      {/* Organizer Info */}
      <div className={cn(
        "pt-4 border-t border-border",
        isCollapsed && "flex flex-col items-center"
      )}>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-3",
          isCollapsed && "p-2"
        )}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={organizer.logo_url || undefined} />
            <AvatarFallback className="text-xs">
              {organizer.display_name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{organizer.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">Organizador</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-muted-foreground hover:bg-muted/50 hover:text-destructive w-full",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <span className="text-sm">Sair</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col h-screen border-r border-border py-6 sticky top-0 shrink-0 transition-all duration-300 bg-card",
          isCollapsed ? "w-[72px] px-2" : "w-[240px] px-4"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span 
              className="font-display text-xl font-bold"
              style={{ 
                background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              UPPLIN
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/organizador/evento/novo"
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
            >
              <Plus className="h-5 w-5 text-white" />
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex flex-col h-full p-6">
                  {/* Mobile Organizer Info */}
                  <div className="flex items-center gap-3 pb-6 border-b border-border mb-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={organizer.logo_url || undefined} />
                      <AvatarFallback>
                        {organizer.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{organizer.display_name}</p>
                      <p className="text-sm text-muted-foreground">Organizador</p>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 flex flex-col gap-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                          isActive(item.href, item.exact)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile Logout */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive transition-all mt-4"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sair</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="lg:p-8 p-4 pt-20 lg:pt-8">
          <Outlet context={{ organizer }} />
        </div>
      </main>
    </div>
  );
}

// Hook to access organizer context in child routes
export function useOrganizerContext() {
  const context = useOutletContext() as { organizer: any };
  return { organizer: context.organizer };
}
