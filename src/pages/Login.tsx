import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2, Ticket, ArrowLeft, LogOut } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { getPublicAppOrigin } from "@/lib/public-origin";

const getParticipantDestination = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("cpf")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading participant destination:", error);
    return "/";
  }

  return data?.cpf ? "/" : "/onboarding";
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [searchParams] = useSearchParams();
  const { signIn, signInWithGoogle, signOut, authReady } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sessionExpired = searchParams.get("sessao_encerrada") === "1";
  const emailConfirmed = searchParams.get("confirmado") === "1";

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: (v: string) => v.length >= 6 }], []);
  const isFormValid = isValidEmail(email) && password.length >= 6;

  const doSignIn = async () => {
    setLoading(true);
    setLoginError(null);
    const { error, user } = await signIn(email, password);

    if (error) {
      setLoading(false);
      setAttemptCount((c) => c + 1);
      setLoginError(error.message);
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      setAttemptCount(0);
      setLoginError(null);
      const destination = user ? await getParticipantDestination(user.id) : "/";
      setLoading(false);
      navigate(destination);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!isFormValid) {
      toast({
        title: "Dados incompletos",
        description: "Informe um e-mail válido e sua senha para entrar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { conflict, currentEmail } = await checkSessionConflict(email);
    setLoading(false);

    if (conflict) {
      setConflictEmail(currentEmail);
      setPendingSubmit(true);
      return;
    }

    await doSignIn();
  };

  const handleForceLogin = async () => {
    setConflictEmail(null);
    setPendingSubmit(false);
    // Sign out current session first, then log in with new credentials
    await signOut();
    await doSignIn();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle(getPublicAppOrigin());
    if (error) {
      setLoading(false);
      toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
      {/* Conflict Dialog */}
      <AlertDialog open={!!conflictEmail} onOpenChange={(open) => { if (!open) { setConflictEmail(null); setPendingSubmit(false); } }}>
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

      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D)" }}
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF2D2D, #FF007A)" }}
          animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
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
          {/* Session expired notice */}
          {sessionExpired && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">
              Sua sessão foi encerrada porque outra conta fez login em outro dispositivo ou aba.
            </div>
          )}

          {emailConfirmed && (
            <div className="mb-4 p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs text-center">
              E-mail confirmado com sucesso. Faça login para seguir ao onboarding.
            </div>
          )}

          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <Link to="/" className="inline-block">
              <motion.span
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
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
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-foreground text-sm font-medium w-fit mx-auto">
              <Ticket className="h-4 w-4" />
              Participante
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Bem-vindo de volta!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Entre para ver seus ingressos e descobrir eventos.
              </p>
            </div>
          </div>

          {/* Google Button */}
          <Button variant="outline" className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium" onClick={handleGoogleSignIn} disabled={loading || !authReady}>
            <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </Button>

          {/* Divider */}
          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">ou</span>
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
                <Link to="/recuperar-senha" className="text-[10px] sm:text-xs text-primary hover:underline">
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
            <Button type="submit" className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium btn-gradient" disabled={loading || !authReady}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
            {submitAttempted && !isFormValid ? (
              <p className="text-xs text-muted-foreground text-center">
                Preencha seu e-mail e senha para continuar.
              </p>
            ) : null}
            {loginError ? (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                <p className="text-xs sm:text-sm text-destructive font-medium">
                  {loginError}
                </p>
                <ul className="text-[11px] sm:text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  <li>Confira se digitou o e-mail corretamente.</li>
                  <li>Verifique se o Caps Lock está desligado.</li>
                  {attemptCount >= 2 && (
                    <li>
                      Esqueceu a senha?{" "}
                      <Link to="/recuperar-senha" className="text-primary hover:underline">
                        Recupere agora
                      </Link>
                      .
                    </li>
                  )}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs"
                  onClick={() => {
                    setLoginError(null);
                    void doSignIn();
                  }}
                  disabled={loading || !isFormValid}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </form>


          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border text-center space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">Criar conta</Link>
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              É organizador?{" "}
              <Link to="/organizador/login" className="text-primary hover:underline font-medium">
                Entrar como organizador →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
