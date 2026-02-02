import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Building2, ArrowLeft } from "lucide-react";
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
      navigate("/organizador/painel");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/4 -right-10 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D)" }}
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 -left-10 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF2D2D, #FF007A)" }}
          animate={{ 
            scale: [1.3, 1, 1.3],
            x: [0, -50, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Back Button */}
      <Link 
        to="/" 
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm font-medium">Voltar</span>
      </Link>

      {/* Centered Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4 mb-5 sm:mb-8">
            <Link to="/" className="inline-block">
              <motion.span 
                className="font-display text-2xl sm:text-4xl font-bold tracking-tight"
                style={{ 
                  background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                UPPLIN
              </motion.span>
            </Link>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium w-fit mx-auto">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Área do Organizador
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground">Portal do Organizador</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Gerencie seus eventos e vendas.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6 p-3 sm:p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-foreground">2M+</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Ingressos</div>
            </div>
            <div className="text-center border-x border-border/50">
              <div className="text-base sm:text-lg font-bold text-foreground">50k+</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-foreground">99.9%</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Uptime</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email</Label>
              <ValidatedInput 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                className="h-11 sm:h-12 text-sm" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                icon={<Mail className="h-4 w-4" />}
                validationRules={emailRules}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium">Senha</Label>
                <Link to="/recuperar-senha?tipo=organizador" className="text-[10px] sm:text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <ValidatedInput 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-11 sm:h-12 text-sm" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                icon={<Lock className="h-4 w-4" />}
                validationRules={passwordRules}
              />
            </div>
            <Button type="submit" className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium btn-gradient" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar no Painel"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-[10px] sm:text-xs text-center text-muted-foreground mb-0.5 sm:mb-1">
              <strong>Demo:</strong> demo.organizador@upplin.app
            </p>
            <p className="text-[10px] sm:text-xs text-center font-mono text-muted-foreground">
              Senha: Demo@2026
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border text-center space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/organizador/cadastro" className="text-primary hover:underline font-medium">Criar conta</Link>
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quer comprar ingressos?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Entrar como participante →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
