import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation, useOutletContext } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Tag, 
  QrCode, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  BarChart3,
  Crown,
  MessageCircle,
  Users,
  Undo2
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const SIDEBAR_COLLAPSED_KEY = "upplin_org_sidebar_collapsed";

const navItems = [
  { href: "/organizador/painel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/organizador/painel/eventos", label: "Meus Eventos", icon: Calendar },
  { href: "/organizador/painel/compradores", label: "Compradores", icon: Users },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/organizador/painel/cupons", label: "Cupons", icon: Tag },
  { href: "/organizador/painel/check-in", label: "Check-in", icon: QrCode },
  { href: "/organizador/painel/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/organizador/painel/assinaturas", label: "Planos", icon: Crown },
  { href: "/organizador/painel/reembolsos", label: "Reembolsos", icon: Undo2 },
  { href: "/organizador/painel/configuracoes", label: "Configurações", icon: Settings },
];

export function OrganizerLayout() {
  const { user, loading: authLoading } = useAuth();
  const { logout, loggingOut } = useLogout({ redirectTo: "/organizador/login" });
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

  const handleSignOut = () => logout();

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

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Desktop Sidebar - Fixed with internal scroll */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        {/* Logo - Fixed at top */}
        <div className={cn(
          "flex items-center shrink-0 py-6 border-b border-border",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
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
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center p-2 mx-2 mt-4 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Create Event Button */}
        <div className={cn("shrink-0", isCollapsed ? "px-2 pt-4" : "px-4 pt-6")}>
          <Link
            to="/organizador/painel/evento/novo"
            className={cn(
              "flex items-center gap-2 rounded-xl shadow-lg",
              isCollapsed ? "justify-center p-3" : "px-4 py-3"
            )}
            style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)" }}
          >
            <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            {!isCollapsed && (
              <span className="text-white font-semibold text-sm">Criar Evento</span>
            )}
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <ScrollArea className="flex-1 py-4">
          <nav className={cn("flex flex-col gap-1", isCollapsed ? "px-2" : "px-4")}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                  isCollapsed && "justify-center",
                  isActive(item.href, item.exact)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Organizer Info - Fixed at bottom */}
        <div className={cn(
          "shrink-0 border-t border-border",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-3",
            isCollapsed && "p-2 justify-center"
          )}>
            <Avatar className="h-9 w-9 shrink-0">
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
              to="/organizador/painel/evento/novo"
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
                <div className="flex flex-col h-full">
                  {/* Mobile Organizer Info */}
                  <div className="flex items-center gap-3 p-6 border-b border-border shrink-0">
                    <Avatar className="h-12 w-12 shrink-0">
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

                  {/* Mobile Navigation - Scrollable */}
                  <ScrollArea className="flex-1">
                    <nav className="p-4 space-y-1">
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
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </nav>
                  </ScrollArea>

                  {/* Mobile Logout - Fixed at bottom */}
                  <div className="p-4 border-t border-border shrink-0">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive transition-all w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sair</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content - Offset for fixed sidebar */}
      <main className={cn(
        "flex-1 min-w-0 transition-all duration-300",
        isCollapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
      )}>
        <div className="p-4 pt-[72px] lg:pt-8 lg:p-8 min-h-[100dvh]">
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
