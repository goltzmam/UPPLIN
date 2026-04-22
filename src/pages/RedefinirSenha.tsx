import { useState, useMemo } from "react";
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
  const { toast } = useToast();

  const passwordRules = useMemo(() => [{ test: isValidPassword }], []);
  const confirmRules = useMemo(() => [{ test: (v: string) => v === password && v.length >= 6 }], [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPassword(password)) {
      toast({ title: "Senha muito fraca", description: "Use no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao redefinir senha", description: error.message, variant: "destructive" });
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
            Nova senha
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-secondary-foreground/70"
          >
            Crie uma nova senha segura para sua conta.
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
                    Sua nova senha já está ativa. Você será redirecionado em instantes.
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
                    Redefinir senha
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Escolha uma nova senha para voltar a acessar sua conta com segurança.
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
                    <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
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
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
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
