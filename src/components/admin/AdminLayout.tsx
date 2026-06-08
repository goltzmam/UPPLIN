import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, MessageCircle, LayoutDashboard, LogOut, Calendar, CreditCard, FileText, Settings, BarChart3, Menu, X, Crown, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/chats", label: "Central de Mensagens", icon: MessageCircle },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/orders", label: "Pedidos", icon: CreditCard },
  { href: "/admin/refunds", label: "Reembolsos", icon: Undo2 },
  { href: "/admin/subscriptions", label: "Assinaturas", icon: Crown },
  { href: "/admin/cpf", label: "Solicitações CPF", icon: FileText },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];

export function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { logout, loggingOut } = useLogout({ redirectTo: "/admin/login" });
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate("/admin/login");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [authLoading, rolesLoading, user, isAdmin, navigate]);

  const handleSignOut = () => logout();

  if (authLoading || rolesLoading) {
    return <PageLoading />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-muted/30 flex overflow-hidden">
      {/* Desktop Sidebar - Fixed with internal scroll */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 bg-card border-r border-border">
        {/* Logo - Fixed at top */}
        <div className="p-6 border-b border-border shrink-0">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-lg font-bold">UPPLIN</span>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* User - Fixed at bottom */}
        <div className="p-4 border-t border-border shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Admin</span>
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 p-6 border-b border-border shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Admin Panel</p>
                    <p className="text-sm text-muted-foreground">UPPLIN</p>
                  </div>
                </div>

                {/* Navigation - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="p-4 space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Logout - Fixed at bottom */}
                <div className="p-4 border-t border-border shrink-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content - Offset for fixed sidebar */}
      <main className="flex-1 lg:ml-64 min-w-0 overflow-y-auto scrollbar-thin">
        <div className="p-4 pt-[72px] lg:pt-8 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
