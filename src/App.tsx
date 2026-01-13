import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Eventos from "./pages/Eventos";
import Evento from "./pages/Evento";
import Perfil from "./pages/Perfil";
import MeusIngressos from "./pages/MeusIngressos";
import Checkout from "./pages/Checkout";
import OrganizerDashboard from "./pages/organizador/Dashboard";
import EventoForm from "./pages/organizador/EventoForm";
import Admin from "./pages/admin/Admin";
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/evento/:id" element={<Evento />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/meus-ingressos" element={<MeusIngressos />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/organizador" element={<OrganizerDashboard />} />
            <Route path="/organizador/evento/:eventId" element={<EventoForm />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
