import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Loader2, Ticket, Building2, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidPassword } from "@/lib/validation";

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const isOrganizer = searchParams.get("tipo") === "organizador";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryChecking, setRecoveryChecking] = useState(true);
  const { toast } = useToast();
  const accountLabel = isOrganizer ? "organizador" : "participante";

  const passwordRules = useMemo(() => [{ test: isValidPassword }], []);
  const confirmRules = useMemo(() => [{ test: (v: string) => v === password && v.length >= 6 }], [password]);

  useEffect(() => {
    const clearRecoveryParamsFromUrl = () => {
      const nextSearchParams = new URLSearchParams(window.location.search);
      ["access_token", "refresh_token", "expires_in", "token_type", "type", "token_hash"].forEach((key) => {
        nextSearchParams.delete(key);
      });

      const nextSearch = nextSearchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState({}, document.title, nextUrl);
    };

    const initializeRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
      const type = hashParams.get("type") ?? queryParams.get("type");
      const tokenHash = hashParams.get("token_hash") ?? queryParams.get("token_hash");

      try {
        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

          if (error) throw error;

          setRecoveryReady(true);
          clearRecoveryParamsFromUrl();
          return;
        }

        if (type === "recovery" && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });

          if (error) throw error;

          setRecoveryReady(true);
          clearRecoveryParamsFromUrl();
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setRecoveryReady(Boolean(session));
      } catch {
        setRecoveryReady(false);
        toast({
          title: "Link inválido ou expirado",
          description: "Solicite um novo e-mail de recuperação para continuar.",
          variant: "destructive"
        });
      } finally {
        setRecoveryChecking(false);
      }
    };

    void initializeRecovery();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPassword(password)) {
      toast({ title: "Senha muito fraca", description: "Crie uma senha com pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "As senhas não conferem", description: "Confira os campos e tente novamente.", variant: "destructive" });
      return;
    }

    if (!recoveryReady) {
      toast({
        title: "Abra o link do e-mail primeiro",
        description: "Para redefinir a senha, use o link recebido no seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      const description = /session|token|expired|invalid/i.test(error.message)
        ? "Esse link de recuperação expirou ou já foi usado. Solicite um novo e-mail de recuperação para continuar."
        : "Abra novamente o link recebido por e-mail e tente de novo.";

      toast({
        title: "Não foi possível salvar sua nova senha",
        description,
        variant: "destructive"
      });
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate(isOrganizer ? "/organizador" : "/");
      }, 2000);
    }
  };

  const loginPath = isOrganizer ? "/organizador/login" : "/login";
  const Icon = isOrganizer ? Building2 : Ticket;
  const label = isOrganizer ? "Área do Organizador" : "Participante";

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
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4"
          >
            Redefinir sua senha
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-secondary-foreground/70"
          >
            Crie uma nova senha para concluir a recuperação da sua conta com segurança.
          </motion.p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">UPPLIN</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-foreground text-sm font-medium">
              <Icon className="h-4 w-4" />
              {label}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    Senha redefinida!
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Sua nova senha da conta {accountLabel} já está ativa. Agora é só continuar seu acesso normalmente.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="text-center lg:text-left space-y-2">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    Redefinir sua senha
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Escolha sua nova senha para concluir a recuperação iniciada pelo e-mail de redefinição enviado pela UPPLIN.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">Nova senha</Label>
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
                    <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres para manter sua conta protegida.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirmar senha</Label>
                    <ValidatedInput
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      icon={<Lock className="h-4 w-4" />}
                      validationRules={confirmRules}
                    />
                  </div>
                  {!recoveryReady && !recoveryChecking ? (
                    <p className="text-xs text-muted-foreground">
                      Abra o link mais recente enviado para seu e-mail para liberar a troca de senha.
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading || recoveryChecking}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
                  </Button>
                </form>

                <div className="text-center">
                  <Link 
                    to={loginPath}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para login
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
