import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Mail, Lock, Loader2, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validation";

export default function OrganizadorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: (v: string) => v.length >= 1 }], []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/organizador");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center text-secondary-foreground">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6 sm:mb-8"
          >
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4"
          >
            Portal do Organizador
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-secondary-foreground/70"
          >
            Acesse sua área exclusiva para gerenciar eventos e vendas.
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-3 gap-4 text-center"
          >
            <div>
              <div className="text-2xl font-bold">2M+</div>
              <div className="text-xs text-secondary-foreground/60">Ingressos vendidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">50k+</div>
              <div className="text-xs text-secondary-foreground/60">Eventos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-xs text-secondary-foreground/60">Uptime</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center">
                <Calendar className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">UPPLIN</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-foreground text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Área do Organizador
            </div>
          </div>
          
          <div className="text-center lg:text-left space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Entrar na sua conta</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/organizador/cadastro" className="text-primary hover:underline font-medium">Criar conta de organizador</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <ValidatedInput 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                className="h-11 sm:h-12 text-sm sm:text-base" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                icon={<Mail className="h-4 w-4" />}
                validationRules={emailRules}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Link 
                  to="/recuperar-senha?tipo=organizador" 
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <ValidatedInput 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-11 sm:h-12 text-sm sm:text-base" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                icon={<Lock className="h-4 w-4" />}
                validationRules={passwordRules}
              />
            </div>
            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Quer comprar ingressos?</p>
            <Link 
              to="/login" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Entrar como participante →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
