import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { stopAllMediaPipelines } from "@/lib/media";
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
import AssinaturasContent from "./pages/organizador/AssinaturasContent";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChats from "./pages/admin/AdminChats";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCpf from "./pages/admin/AdminCpf";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

// Other imports
import Precos from "./pages/Precos";
import Organizadores from "./pages/Organizadores";
import ExplorarOrganizadores from "./pages/ExplorarOrganizadores";
import EventosSalvos from "./pages/EventosSalvos";
import PorPerto from "./pages/PorPerto";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoPendente from "./pages/PagamentoPendente";
import CollaboratorScanner from "./pages/CollaboratorScanner";
import NotFound from "./pages/NotFound";
import LpOrganizador from "./pages/LpOrganizador";
import PoliticaPlano from "./pages/PoliticaPlano";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

if (typeof window !== "undefined") {
  (window as unknown as { __QUERY_CLIENT__?: typeof queryClient }).__QUERY_CLIENT__ = queryClient;
}

// Simplified routes wrapper - removed heavy AnimatePresence for mobile performance
function AnimatedRoutes() {
  const location = useLocation();

  // Global kill-switch: stop any media when navigating away from feed pages
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const feedPaths = ["/", "/feed"];
    const isGoingToFeed = feedPaths.some(p => location.pathname === p);
    // Only kill media when navigating AWAY from feed, not when arriving at it
    if (!isGoingToFeed && prevPathRef.current !== location.pathname) {
      stopAllMediaPipelines();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, location.search, location.hash]);

  return (
    <div style={{ minHeight: '100vh' }}>
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
          <Route path="/por-perto" element={<PorPerto />} />
          <Route path="/planos/organizador" element={<LpOrganizador />} />
          <Route path="/politica/:slug" element={<PoliticaPlano />} />
          
          
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
          <Route path="/pagamento-sucesso" element={<ProtectedRoute><PagamentoSucesso /></ProtectedRoute>} />
          <Route path="/pagamento-pendente/:orderId" element={<ProtectedRoute><PagamentoPendente /></ProtectedRoute>} />
          <Route path="/eventos-salvos" element={<ProtectedRoute><EventosSalvos /></ProtectedRoute>} />
          <Route path="/scan/:eventId" element={<ProtectedRoute><CollaboratorScanner /></ProtectedRoute>} />

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
            <Route path="assinaturas" element={<AssinaturasContent />} />
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
            <Route path="users" element={<AdminUsers />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="cpf" element={<AdminCpf />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);


export default App;
