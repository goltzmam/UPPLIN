import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OrganizerRoute } from "@/components/auth/OrganizerRoute";
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
import OrganizerDashboard from "./pages/organizador/Dashboard";
import EventoForm from "./pages/organizador/EventoForm";
import CheckIn from "./pages/organizador/CheckIn";
import OrganizadorLogin from "./pages/organizador/OrganizadorLogin";
import OrganizadorCadastro from "./pages/organizador/OrganizadorCadastro";
import OnboardingOrganizador from "./pages/organizador/OnboardingOrganizador";
import OrganizadorPublico from "./pages/organizador/Organizador";
import Cupons from "./pages/organizador/Cupons";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChats from "./pages/admin/AdminChats";
import Precos from "./pages/Precos";
import Organizadores from "./pages/Organizadores";
import ExplorarOrganizadores from "./pages/ExplorarOrganizadores";
import EventosSalvos from "./pages/EventosSalvos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.25,
  ease: [0.25, 0.46, 0.45, 0.94] as const, // Apple-like easing
};

// Animated routes wrapper
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
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

          {/* Protected Organizer Routes */}
          <Route path="/organizador" element={<OrganizerRoute><OrganizerDashboard /></OrganizerRoute>} />
          <Route path="/organizador/evento/:eventId" element={<OrganizerRoute><EventoForm /></OrganizerRoute>} />
          <Route path="/organizador/cupons" element={<OrganizerRoute><Cupons /></OrganizerRoute>} />
          <Route path="/organizador/check-in" element={<OrganizerRoute><CheckIn /></OrganizerRoute>} />

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
