import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
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
import OrganizerDashboard from "./pages/organizador/Dashboard";
import EventoForm from "./pages/organizador/EventoForm";
import CheckIn from "./pages/organizador/CheckIn";
import OrganizadorLogin from "./pages/organizador/OrganizadorLogin";
import OrganizadorCadastro from "./pages/organizador/OrganizadorCadastro";
import OnboardingOrganizador from "./pages/organizador/OnboardingOrganizador";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChats from "./pages/admin/AdminChats";
import Precos from "./pages/Precos";
import Organizadores from "./pages/Organizadores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/evento/:id" element={<Evento />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/meus-ingressos" element={<MeusIngressos />} />
            <Route path="/mensagens" element={<Mensagens />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/precos" element={<Precos />} />
            <Route path="/organizadores" element={<Organizadores />} />

            {/* Organizer Routes */}
            <Route path="/organizador/login" element={<OrganizadorLogin />} />
            <Route path="/organizador/cadastro" element={<OrganizadorCadastro />} />
            <Route path="/organizador/onboarding" element={<OnboardingOrganizador />} />
            <Route path="/organizador" element={<OrganizerDashboard />} />
            <Route path="/organizador/evento/:eventId" element={<EventoForm />} />
            <Route path="/organizador/check-in" element={<CheckIn />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="chats" element={<AdminChats />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
