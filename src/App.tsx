import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
// Organizer imports
import OrganizadorLogin from "./pages/organizador/OrganizadorLogin";
import OrganizadorCadastro from "./pages/organizador/OrganizadorCadastro";
import OnboardingOrganizador from "./pages/organizador/OnboardingOrganizador";
import OrganizadorPublico from "./pages/organizador/Organizador";
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
      staleTime: 1000 * 60 * 5, // 5 minutes - aggressive caching for snappier UX
      gcTime: 1000 * 60 * 60, // 60 minutes cache retention
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Disable to prevent unnecessary refetches
      refetchOnMount: false, // Use cached data when available
      retry: 1, // Reduce retries for faster failure
      retryDelay: 1000, // Fixed 1 second retry delay
      networkMode: 'offlineFirst', // Prefer cached data first
    },
    mutations: {
      retry: 0, // No retry for mutations
    },
  },
});

// Animated routes wrapper - smooth fade without flashing
function AnimatedRoutes() {
  const location = useLocation();

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
          {/* Public Routes */}
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
          <Route path="/organizador/:id" element={<OrganizadorPublico />} />

          {/* Protected User Routes */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/meus-ingressos" element={<ProtectedRoute><MeusIngressos /></ProtectedRoute>} />
          <Route path="/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
          <Route path="/checkout/:orderId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/eventos-salvos" element={<ProtectedRoute><EventosSalvos /></ProtectedRoute>} />

          {/* Organizer Auth Routes */}
          <Route path="/organizador/login" element={<OrganizadorLogin />} />
          <Route path="/organizador/cadastro" element={<OrganizadorCadastro />} />
          <Route path="/organizador/onboarding" element={<ProtectedRoute redirectTo="/organizador/login"><OnboardingOrganizador /></ProtectedRoute>} />

          {/* Protected Organizer Routes - with Layout */}
          <Route path="/organizador" element={<OrganizerLayout />}>
            <Route index element={<OrganizerDashboardContent />} />
            <Route path="eventos" element={<EventosListContent />} />
            <Route path="evento/:eventId" element={<EventoForm />} />
            <Route path="cupons" element={<CuponsContent />} />
            <Route path="check-in" element={<CheckInContent />} />
            <Route path="configuracoes" element={<ConfiguracoesContent />} />
            <Route path="relatorios" element={<RelatoriosContent />} />
          </Route>

          {/* Admin Routes */}
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
