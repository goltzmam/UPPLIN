import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Onboarding from "./pages/Onboarding";
import Eventos from "./pages/Eventos";
import Evento from "./pages/Evento";
import Perfil from "./pages/Perfil";
import MeusIngressos from "./pages/MeusIngressos";
import Mensagens from "./pages/Mensagens";
import Checkout from "./pages/Checkout";
import Instalar from "./pages/Instalar";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

// Organizer imports - PUBLIC profile
import OrganizerPublicProfile from "./pages/organizador/OrganizerPublicProfile";

// Organizer imports - AUTH & ONBOARDING
import OrganizadorLogin from "./pages/organizador/OrganizadorLogin";
import OrganizadorCadastro from "./pages/organizador/OrganizadorCadastro";
import OnboardingOrganizador from "./pages/organizador/OnboardingOrganizador";

// Organizer imports - PRIVATE DASHBOARD (painel)
import { OrganizerLayout } from "./components/organizador/OrganizerLayout";
import OrganizerDashboardContent from "./pages/organizador/OrganizerDashboardContent";
import EventosListContent from "./pages/organizador/EventosListContent";
import EventoForm from "./pages/organizador/EventoForm";
import CuponsContent from "./pages/organizador/CuponsContent";
import CheckInContent from "./pages/organizador/CheckInContent";
import ConfiguracoesContent from "./pages/organizador/ConfiguracoesContent";
import RelatoriosContent from "./pages/organizador/RelatoriosContent";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChats from "./pages/admin/AdminChats";

// Other imports
import Precos from "./pages/Precos";
import Organizadores from "./pages/Organizadores";
import ExplorarOrganizadores from "./pages/ExplorarOrganizadores";
import EventosSalvos from "./pages/EventosSalvos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
    },
  },
});

if (typeof window !== "undefined") {
  (window as unknown as { __QUERY_CLIENT__?: typeof queryClient }).__QUERY_CLIENT__ = queryClient;
}

// Animated routes wrapper
function AnimatedRoutes() {
  const location = useLocation();

  // Global kill-switch: prevent any lingering feed audio when navigating away.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"));
    for (const el of els) {
      try {
        el.pause();
        el.muted = true;
        el.volume = 0;
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      } catch {
        // ignore
      }
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          {/* ============================================ */}
          {/* PUBLIC ROUTES - Accessible to everyone       */}
          {/* ============================================ */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/evento/:id" element={<Evento />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/organizadores" element={<Organizadores />} />
          <Route path="/explorar-organizadores" element={<ExplorarOrganizadores />} />
          <Route path="/instalar" element={<Instalar />} />
          
          {/* PUBLIC ORGANIZER PROFILE - /o/:slug for participants to view */}
          <Route path="/o/:slug" element={<OrganizerPublicProfile />} />
          
          {/* Legacy redirect: /organizador/:id -> /o/:slug */}
          <Route path="/organizador/:id" element={<OrganizerPublicProfile />} />

          {/* ============================================ */}
          {/* PROTECTED PARTICIPANT ROUTES                 */}
          {/* ============================================ */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/meus-ingressos" element={<ProtectedRoute><MeusIngressos /></ProtectedRoute>} />
          <Route path="/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
          <Route path="/checkout/:orderId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/eventos-salvos" element={<ProtectedRoute><EventosSalvos /></ProtectedRoute>} />

          {/* ============================================ */}
          {/* ORGANIZER AUTH ROUTES                        */}
          {/* ============================================ */}
          <Route path="/organizador/login" element={<OrganizadorLogin />} />
          <Route path="/organizador/cadastro" element={<OrganizadorCadastro />} />
          <Route path="/organizador/onboarding" element={<ProtectedRoute redirectTo="/organizador/login"><OnboardingOrganizador /></ProtectedRoute>} />

          {/* ============================================ */}
          {/* ORGANIZER PRIVATE DASHBOARD (/organizador/painel/*) */}
          {/* This is the business management area         */}
          {/* ============================================ */}
          <Route path="/organizador/painel" element={<OrganizerLayout />}>
            <Route index element={<OrganizerDashboardContent />} />
            <Route path="eventos" element={<EventosListContent />} />
            <Route path="evento/:eventId" element={<EventoForm />} />
            <Route path="cupons" element={<CuponsContent />} />
            <Route path="check-in" element={<CheckInContent />} />
            <Route path="configuracoes" element={<ConfiguracoesContent />} />
            <Route path="relatorios" element={<RelatoriosContent />} />
          </Route>
          
          {/* Legacy redirects: old /organizador/* paths -> new /organizador/painel/* */}
          <Route path="/organizador" element={<Navigate to="/organizador/painel" replace />} />
          <Route path="/organizador/eventos" element={<Navigate to="/organizador/painel/eventos" replace />} />
          <Route path="/organizador/evento/:eventId" element={<Navigate to="/organizador/painel/evento/:eventId" replace />} />
          <Route path="/organizador/cupons" element={<Navigate to="/organizador/painel/cupons" replace />} />
          <Route path="/organizador/check-in" element={<Navigate to="/organizador/painel/check-in" replace />} />
          <Route path="/organizador/configuracoes" element={<Navigate to="/organizador/painel/configuracoes" replace />} />
          <Route path="/organizador/relatorios" element={<Navigate to="/organizador/painel/relatorios" replace />} />

          {/* ============================================ */}
          {/* ADMIN ROUTES                                 */}
          {/* ============================================ */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="chats" element={<AdminChats />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
