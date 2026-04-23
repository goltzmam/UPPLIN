import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Building2, ArrowLeft, LogOut, User } from "lucide-react";
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
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { buildPublicAppUrl } from "@/lib/public-origin";

const getOrganizerDestination = async (userId: string) => {
  const { data, error } = await supabase
    .from("organizer_accounts")
    .select("id, cnpj, display_name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading organizer destination:", error);
    return "/organizador/onboarding";
  }

  if (!data) return "/organizador/onboarding";
  return data.cnpj && data.display_name ? "/organizador/painel" : "/organizador/onboarding";
};

export default function OrganizadorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast({ title: "Você saiu da conta", description: "Sessão encerrada com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao sair", description: err.message, variant: "destructive" });
    } finally {
      setSigningOut(false);
    }
  };

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: (v: string) => v.length >= 6 }], []);

  const doSignIn = async () => {
    setLoading(true);
    const { error, user: signedUser } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      const destination = signedUser ? await getOrganizerDestination(signedUser.id) : "/organizador/onboarding";
      navigate(destination);
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: buildPublicAppUrl("/organizador/onboarding"),
      });
      if (error) {
        toast({ title: "Erro com Google", description: String(error), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-start sm:items-center justify-center px-4 py-8 sm:p-6 relative">
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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

          {/* Active session banner */}
          {user && (
            <div
              className="mb-4 p-3 rounded-xl border flex items-start gap-3"
              style={{ borderColor: "rgba(245, 158, 11, 0.3)", background: "rgba(245, 158, 11, 0.1)" }}
            >
              <User className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground">
                  Você já está logado como{" "}
                  <span className="font-semibold break-all">{user.email}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Para entrar com outra conta, saia primeiro.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-8 text-xs gap-1.5"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  Sair da conta
                </Button>
              </div>
            </div>
          )}

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
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium text-white" 
              style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium gap-2"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Entrar com Google
          </Button>


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
