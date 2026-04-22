import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Loader2, Ticket, Building2, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidEmail } from "@/lib/validation";

function buildResetRedirect(origin: string, isOrganizer: boolean) {
  return `${origin}/redefinir-senha${isOrganizer ? "?tipo=organizador" : ""}`;
}

export default function RecuperarSenha() {
  const [searchParams] = useSearchParams();
  const isOrganizer = searchParams.get("tipo") === "organizador";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);

  const accountLabel = isOrganizer ? "organizador" : "participante";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    
    setLoading(true);

    const { error } = await supabase.functions.invoke("request-password-reset", {
      body: {
        email: normalizedEmail,
        isOrganizer,
        redirectOrigin: window.location.origin,
      },
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Não foi possível enviar o link",
        description: "Tente novamente em instantes. Se o problema continuar, solicite suporte.",
        variant: "destructive"
      });
      return;
    }

    setLoading(false);
    setSent(true);
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
            <h2 
              className="font-display text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ 
                background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              UPPLIN
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4"
          >
            Recuperar acesso
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-secondary-foreground/70"
          >
            Vamos enviar um link seguro para você redefinir sua senha em poucos passos.
          </motion.p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex flex-col items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <span 
                className="font-display text-3xl font-bold tracking-tight"
                style={{ 
                  background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                UPPLIN
              </span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-foreground text-sm font-medium">
              <Icon className="h-4 w-4" />
              {label}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
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
                    Link enviado
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Se existir uma conta {accountLabel} com esse e-mail, você vai receber uma mensagem da UPPLIN em português com o botão “Redefinir minha senha”.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to={loginPath}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para login
                  </Link>
                </Button>
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
                    Informe o e-mail da sua conta {accountLabel} para receber um link seguro e continuar a redefinição da sua senha.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">E-mail</Label>
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
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar e-mail de recuperação"}
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
