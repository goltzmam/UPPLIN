import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Mail, Lock, User, Loader2, Ticket, PartyPopper, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail, isValidName, isValidPassword } from "@/lib/validation";

export default function Cadastro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const triggerConfetti = useCallback(() => {
    const duration = 2500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }, []);

  const nameRules = useMemo(() => [{ test: isValidName }], []);
  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: isValidPassword }], []);

  const isFormValid = isValidName(fullName) && isValidEmail(email) && isValidPassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      setShowSuccess(true);
      triggerConfetti();
      toast({ title: "Conta criada!", description: "Complete seu cadastro para continuar." });
      
      setTimeout(() => {
        navigate("/onboarding");
      }, 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <PartyPopper className="h-12 w-12 text-primary" />
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Bem-vindo à UPPLIN!
            </h1>
            <p className="text-muted-foreground mt-2">
              Sua conta foi criada com sucesso
            </p>
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Finalizando cadastro...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Back Button - Fixed Position */}
      <Link 
        to="/" 
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Voltar</span>
      </Link>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">UPPLIN</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-foreground text-sm font-medium">
              <Ticket className="h-4 w-4" />
              Participante
            </div>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Criar sua conta</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
            </p>
          </div>

          <Button variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base" onClick={handleGoogleSignIn}>
            <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm">Nome completo</Label>
              <ValidatedInput 
                id="fullName" 
                placeholder="Seu nome" 
                className="h-11 sm:h-12 text-sm sm:text-base" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required
                icon={<User className="h-4 w-4" />}
                validationRules={nameRules}
              />
            </div>
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
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <ValidatedInput 
                id="password" 
                type="password" 
                placeholder="Mínimo 6 caracteres" 
                className="h-11 sm:h-12 text-sm sm:text-base" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                icon={<Lock className="h-4 w-4" />}
                validationRules={passwordRules}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base" 
              disabled={loading || !isFormValid}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta"}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">É organizador de eventos?</p>
            <Link 
              to="/organizador/cadastro" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Criar conta de organizador →
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center text-secondary-foreground">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center">
              <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Descubra eventos incríveis</h1>
          <p className="text-sm sm:text-base text-secondary-foreground/70">
            Compre ingressos com segurança e nunca perca uma experiência.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">500k+</div>
              <div className="text-xs text-secondary-foreground/60">Usuários</div>
            </div>
            <div>
              <div className="text-2xl font-bold">10k+</div>
              <div className="text-xs text-secondary-foreground/60">Eventos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-secondary-foreground/60">Seguro</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
