import { isOrganizerPlanPath } from "@/lib/store-platform";
import { Capacitor } from "@capacitor/core";
import { webSurface, legacyAdminUrl, legacyRecoveryDestination, PLANS_ORIGIN, APP_ORIGIN } from "@/lib/web-surfaces";
import { RouteSeo } from "@/components/seo/RouteSeo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { stopAllMediaPipelines } from "@/lib/media";
import { getBootRequestId, logBootEvent } from "@/lib/boot-diagnostics";


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
const ExcluirConta = lazy(() => import("./pages/ExcluirConta"));
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

function AppBootFallback() {
  // Esta tela NUNCA pode ficar presa: se a rota não carregar em 8s
  // (chunk travado, rede lenta, WKWebView do iPad), mostramos uma
  // mensagem clara + botão de recarregar em vez de pulsar para sempre.
  const [stalled, setStalled] = useState(false);
  const location = useLocation();
  const requestId = getBootRequestId();
  const shownAtRef = useRef(Date.now());

  useEffect(() => {
    shownAtRef.current = Date.now();
    logBootEvent("fallback_shown", {
      surface: "suspense",
      pending_route: location.pathname,
    });
    const t = window.setTimeout(() => {
      setStalled(true);
      logBootEvent("fallback_stalled", {
        surface: "suspense",
        pending_route: location.pathname,
        waited_ms: Date.now() - shownAtRef.current,
        timeout_ms: 8000,
      });
    }, 8000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleRetry = () => {
    logBootEvent("fallback_manual_retry", {
      surface: "suspense",
      pending_route: location.pathname,
      waited_ms: Date.now() - shownAtRef.current,
    });
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-xs text-center">
        <div
          className="font-display text-3xl font-bold"
          style={{
            background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          UPPLIN
        </div>

        {!stalled ? (
          <div className="mx-auto mt-5 h-1 w-20 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-[shimmer_1.2s_infinite] rounded-full bg-primary" />
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">
              Está demorando mais que o normal para abrir. Verifique sua conexão.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Tentar novamente
            </button>
            <p className="mt-5 font-mono text-[10px] text-muted-foreground/40">
              ID: {requestId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



function ExternalNavigation({ target }: { target: string }) {
  useEffect(() => { window.location.replace(target); }, [target]);
  return <AppBootFallback />;
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

  const surface = webSurface(window.location.hostname, Capacitor.isNativePlatform());
  if (Capacitor.isNativePlatform() && isOrganizerPlanPath(location.pathname)) return <Navigate to="/organizador/painel" replace />;
  const legacyRecovery = legacyRecoveryDestination(location.pathname, location.search, location.hash);
  if (legacyRecovery) return <Navigate to={legacyRecovery} replace />;
  if (surface === "admin") return <Suspense fallback={<AppBootFallback />}>
    <RouteSeo />
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/" element={<AdminLayout />}>
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>;
  if (surface === "plans") return <Suspense fallback={<AppBootFallback />}>
    <RouteSeo />
    <Routes><Route path="/" element={<LpOrganizador />} /><Route path="*" element={<ExternalNavigation target={APP_ORIGIN + location.pathname + location.search + location.hash} />} /></Routes>
  </Suspense>;

  return (
    <div style={{ minHeight: '100vh' }}>
      <RouteSeo />
      <Suspense fallback={<AppBootFallback />}>
        <Routes location={location}>
          {/* ============================================ */}
          {/* PUBLIC ROUTES - Accessible to everyone       */}
          {/* ============================================ */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/email-confirmado" element={<EmailConfirmado />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/organizador/recuperar-senha" element={<RecuperarSenha audience="organizer" />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/organizador/redefinir-senha" element={<RedefinirSenha audience="organizer" />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/evento/:id" element={<Evento />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/organizadores" element={<Organizadores />} />
          <Route path="/explorar-organizadores" element={<ExplorarOrganizadores />} />
          <Route path="/por-perto" element={<PorPerto />} />
          <Route path="/planos/organizador" element={Capacitor.isNativePlatform() ? <NotFound /> : <ExternalNavigation target={PLANS_ORIGIN} />} />
          <Route path="/politica/:slug" element={<PoliticaPlano />} />
          <Route path="/suporte" element={<Suporte />} />
          <Route path="/excluir-conta" element={<ExcluirConta />} />
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

          <Route path="/admin/*" element={Capacitor.isNativePlatform() ? <NotFound /> : <ExternalNavigation target={legacyAdminUrl(location.pathname)} />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AnimatedRoutes />
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);


export default App;
