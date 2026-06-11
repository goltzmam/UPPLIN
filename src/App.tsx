import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { stopAllMediaPipelines } from "@/lib/media";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const EmailConfirmado = lazy(() => import("./pages/EmailConfirmado"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Eventos = lazy(() => import("./pages/Eventos"));
const Evento = lazy(() => import("./pages/Evento"));
const Perfil = lazy(() => import("./pages/Perfil"));
const MeusIngressos = lazy(() => import("./pages/MeusIngressos"));
const Mensagens = lazy(() => import("./pages/Mensagens"));
const Checkout = lazy(() => import("./pages/Checkout"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const OrganizerPublicProfile = lazy(() => import("./pages/organizador/OrganizerPublicProfile"));
const OrganizadorLogin = lazy(() => import("./pages/organizador/OrganizadorLogin"));
const OrganizadorCadastro = lazy(() => import("./pages/organizador/OrganizadorCadastro"));
const OnboardingOrganizador = lazy(() => import("./pages/organizador/OnboardingOrganizador"));
const OrganizerLayout = lazy(() => import("./components/organizador/OrganizerLayout").then((m) => ({ default: m.OrganizerLayout })));
const OrganizerDashboardContent = lazy(() => import("./pages/organizador/OrganizerDashboardContent"));
const EventosListContent = lazy(() => import("./pages/organizador/EventosListContent"));
const EventoForm = lazy(() => import("./pages/organizador/EventoForm"));
const CuponsContent = lazy(() => import("./pages/organizador/CuponsContent"));
const CheckInContent = lazy(() => import("./pages/organizador/CheckInContent"));
const ConfiguracoesContent = lazy(() => import("./pages/organizador/ConfiguracoesContent"));
const RelatoriosContent = lazy(() => import("./pages/organizador/RelatoriosContent"));
const CompradoresContent = lazy(() => import("./pages/organizador/CompradoresContent"));
const AssinaturasContent = lazy(() => import("./pages/organizador/AssinaturasContent"));
const ReembolsosContent = lazy(() => import("./pages/organizador/ReembolsosContent"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminChats = lazy(() => import("./pages/admin/AdminChats"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCpf = lazy(() => import("./pages/admin/AdminCpf"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const Precos = lazy(() => import("./pages/Precos"));
const Organizadores = lazy(() => import("./pages/Organizadores"));
const ExplorarOrganizadores = lazy(() => import("./pages/ExplorarOrganizadores"));
const EventosSalvos = lazy(() => import("./pages/EventosSalvos"));
const PorPerto = lazy(() => import("./pages/PorPerto"));
const PagamentoSucesso = lazy(() => import("./pages/PagamentoSucesso"));
const PagamentoPendente = lazy(() => import("./pages/PagamentoPendente"));
const CollaboratorScanner = lazy(() => import("./pages/CollaboratorScanner"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LpOrganizador = lazy(() => import("./pages/LpOrganizador"));
const PoliticaPlano = lazy(() => import("./pages/PoliticaPlano"));
const Suporte = lazy(() => import("./pages/Suporte"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const PrivacidadeParticipante = lazy(() => import("./pages/PrivacidadeParticipante"));
const PrivacidadeOrganizador = lazy(() => import("./pages/PrivacidadeOrganizador"));
const Termos = lazy(() => import("./pages/Termos"));
const TermosParticipante = lazy(() => import("./pages/TermosParticipante"));
const TermosOrganizador = lazy(() => import("./pages/TermosOrganizador"));

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
  usePresenceHeartbeat();


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
          <Route path="/email-confirmado" element={<EmailConfirmado />} />
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
          <Route path="/suporte" element={<Suporte />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/privacidade/participante" element={<PrivacidadeParticipante />} />
          <Route path="/privacidade/organizador" element={<PrivacidadeOrganizador />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/termos/participante" element={<TermosParticipante />} />
          <Route path="/termos/organizador" element={<TermosOrganizador />} />
          
          
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
            <Route path="compradores" element={<CompradoresContent />} />
            <Route path="assinaturas" element={<AssinaturasContent />} />
            <Route path="reembolsos" element={<ReembolsosContent />} />
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
            <Route path="refunds" element={<AdminRefunds />} />
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnimatedRoutes />
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);


export default App;
