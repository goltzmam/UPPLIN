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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/4 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D)" }}
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
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
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Voltar</span>
      </Link>

      {/* Centered Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <Link to="/" className="inline-block">
              <motion.span 
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight"
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
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit mx-auto">
              <Building2 className="h-4 w-4" />
              Área do Organizador
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Portal do Organizador</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie seus eventos e vendas.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">2M+</div>
              <div className="text-[10px] text-muted-foreground">Ingressos</div>
            </div>
            <div className="text-center border-x border-border/50">
              <div className="text-lg font-bold text-foreground">50k+</div>
              <div className="text-[10px] text-muted-foreground">Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">99.9%</div>
              <div className="text-[10px] text-muted-foreground">Uptime</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <ValidatedInput 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                className="h-12" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                icon={<Mail className="h-4 w-4" />}
                validationRules={emailRules}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <Link to="/recuperar-senha?tipo=organizador" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <ValidatedInput 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-12" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                icon={<Lock className="h-4 w-4" />}
                validationRules={passwordRules}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-sm font-medium btn-gradient" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar no Painel"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-xs text-center text-muted-foreground mb-1">
              <strong>Demo:</strong> demo.organizador@upplin.app
            </p>
            <p className="text-xs text-center font-mono text-muted-foreground">
              Senha: Demo@2026
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-border text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/organizador/cadastro" className="text-primary hover:underline font-medium">Criar conta</Link>
            </p>
            <p className="text-sm text-muted-foreground">
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
