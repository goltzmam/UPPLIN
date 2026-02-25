import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Building2, ArrowLeft, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validation";
import { checkSessionConflict } from "@/lib/session-guard";

export default function OrganizadorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: (v: string) => v.length >= 6 }], []);

  const doSignIn = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/organizador/painel");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { conflict, currentEmail } = await checkSessionConflict(email);
    setLoading(false);

    if (conflict) {
      setConflictEmail(currentEmail);
      return;
    }

    await doSignIn();
  };

  const handleForceLogin = async () => {
    setConflictEmail(null);
    await signOut();
    await doSignIn();
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
      {/* Conflict Dialog */}
      <AlertDialog open={!!conflictEmail} onOpenChange={(open) => { if (!open) setConflictEmail(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              Sessão ativa detectada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma sessão ativa com a conta{" "}
              <strong className="text-foreground">{conflictEmail}</strong>.
              {" "}Para entrar com outra conta, você precisa deslogar da conta atual primeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deslogar e entrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Animated background gradient orbs - GREEN/TEAL for Organizer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-10 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #10B981, #14B8A6)" }}
          animate={{ scale: [1, 1.3, 1], x: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -left-10 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #14B8A6, #06B6D4)" }}
          animate={{ scale: [1.3, 1, 1.3], x: [0, -50, 0] }}
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
                  background: "linear-gradient(135deg, #10B981, #14B8A6, #06B6D4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                UPPLIN
              </motion.span>
            </Link>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-xs sm:text-sm font-medium w-fit mx-auto"
              style={{ background: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)", color: "#10B981" }}
            >
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Área do Organizador
            </div>
            <div>
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
                <Link to="/recuperar-senha?tipo=organizador" className="text-[10px] sm:text-xs hover:underline" style={{ color: "#10B981" }}>
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
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium text-white" 
              style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>


          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border text-center space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/organizador/cadastro" className="hover:underline font-medium" style={{ color: "#10B981" }}>Criar conta</Link>
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quer comprar ingressos?{" "}
              <Link to="/login" className="hover:underline font-medium" style={{ color: "#10B981" }}>
                Entrar como participante →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
