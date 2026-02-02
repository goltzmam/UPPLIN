import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Loader2, Building2, Phone, Globe, Instagram, Facebook, FileText, ChevronRight, ChevronLeft, Check, PartyPopper, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  isValidEmail, 
  isValidName, 
  isValidPassword, 
  isValidCNPJ, 
  isValidPhone,
  formatCNPJ,
  formatPhone
} from "@/lib/validation";

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const stepTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export default function OrganizadorCadastro() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
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

  // Step 1 - Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 - Company
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  // Step 3 - Social
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  // Validation rules
  const nameRules = useMemo(() => [{ test: isValidName }], []);
  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: isValidPassword }], []);
  const companyRules = useMemo(() => [{ test: (v: string) => v.trim().length >= 2 }], []);
  const cnpjRules = useMemo(() => [{ test: isValidCNPJ }], []);
  const phoneRules = useMemo(() => [{ test: isValidPhone }], []);

  // Step validation
  const isStep1Valid = isValidName(fullName) && isValidEmail(email) && isValidPassword(password);
  const isStep2Valid = companyName.trim().length >= 2 && isValidCNPJ(cnpj) && isValidPhone(phone);

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStep1Valid) goToStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStep2Valid) goToStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      
      if (authError) throw authError;

      if (authData?.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "organizer" });
        
        if (roleError && !roleError.message.includes("duplicate")) {
          console.error("Role error:", roleError);
        }

        const { error: orgError } = await supabase
          .from("organizer_accounts")
          .insert({
            owner_user_id: authData.user.id,
            display_name: companyName,
            cnpj: cnpj.replace(/\D/g, ""),
            phone: phone.replace(/\D/g, ""),
            email: email,
            description,
            social_instagram: instagram,
            social_facebook: facebook,
            social_website: website,
          });

        if (orgError) throw orgError;
      }

      setShowSuccess(true);
      triggerConfetti();

      toast({ 
        title: "Conta criada com sucesso!", 
        description: "Vamos configurar seu perfil." 
      });

      setTimeout(() => {
        navigate("/organizador/onboarding");
      }, 2500);
    } catch (err: any) {
      toast({ 
        title: "Erro ao criar conta", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
              Sua conta de organizador foi criada
            </p>
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Preparando seu painel...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-0 left-1/4 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF6A00, #FF2D2D)" }}
          animate={{ 
            y: [0, 100, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-40 h-40 sm:w-80 sm:h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #FF2D2D, #FF007A)" }}
          animate={{ 
            y: [0, -100, 0],
            scale: [1.2, 1, 1.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
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
          <div className="text-center space-y-3 sm:space-y-4 mb-5 sm:mb-6">
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
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Criar conta de organizador</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Já tem conta?{" "}
                <Link to="/organizador/login" className="text-primary hover:underline font-medium">Entrar</Link>
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5 sm:gap-2">
                <motion.div
                  className={`relative h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-semibold text-[10px] sm:text-xs transition-colors ${
                    step > s 
                      ? "bg-primary text-primary-foreground" 
                      : step === s 
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30" 
                        : "bg-muted text-muted-foreground"
                  }`}
                  animate={{ scale: step === s ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {step > s ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : s}
                </motion.div>
                {s < 3 && (
                  <motion.div className="w-6 sm:w-8 h-0.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: step > s ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center font-medium mb-3 sm:mb-4">
            {step === 1 ? "Dados da conta" : step === 2 ? "Dados da empresa" : "Redes sociais (opcional)"}
          </p>

          {/* Form Steps */}
          <div className="relative overflow-hidden min-h-[260px] sm:min-h-[280px]">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.form
                  key="step1"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  onSubmit={handleStep1}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="fullName" className="text-xs sm:text-sm">Seu nome</Label>
                    <ValidatedInput 
                      id="fullName" 
                      placeholder="Nome completo" 
                      className="h-10 sm:h-11 text-sm" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required
                      icon={<User className="h-4 w-4" />}
                      validationRules={nameRules}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                    <ValidatedInput 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="h-10 sm:h-11 text-sm" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required
                      icon={<Mail className="h-4 w-4" />}
                      validationRules={emailRules}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="password" className="text-xs sm:text-sm">Senha</Label>
                    <ValidatedInput 
                      id="password" 
                      type="password" 
                      placeholder="Mínimo 6 caracteres" 
                      className="h-10 sm:h-11 text-sm" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      minLength={6}
                      icon={<Lock className="h-4 w-4" />}
                      validationRules={passwordRules}
                    />
                  </div>
                  <Button type="submit" className="w-full h-10 sm:h-11 gap-2 text-xs sm:text-sm btn-gradient" disabled={!isStep1Valid}>
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  onSubmit={handleStep2}
                  className="space-y-2.5 sm:space-y-3"
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="companyName" className="text-xs sm:text-sm">Nome da Empresa</Label>
                    <ValidatedInput 
                      id="companyName" 
                      placeholder="Ex: Eventos XYZ" 
                      className="h-10 sm:h-11 text-sm" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      required
                      icon={<Building2 className="h-4 w-4" />}
                      validationRules={companyRules}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="cnpj" className="text-xs sm:text-sm">CNPJ</Label>
                    <ValidatedInput 
                      id="cnpj" 
                      placeholder="00.000.000/0000-00" 
                      className="h-10 sm:h-11 text-sm" 
                      value={cnpj} 
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))} 
                      required
                      icon={<FileText className="h-4 w-4" />}
                      validationRules={cnpjRules}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm">Telefone</Label>
                    <ValidatedInput 
                      id="phone" 
                      placeholder="(00) 00000-0000" 
                      className="h-10 sm:h-11 text-sm" 
                      value={phone} 
                      onChange={(e) => setPhone(formatPhone(e.target.value))} 
                      required
                      icon={<Phone className="h-4 w-4" />}
                      validationRules={phoneRules}
                    />
                  </div>
                  <div className="flex gap-2.5 sm:gap-3 pt-1.5 sm:pt-2">
                    <Button type="button" variant="outline" className="flex-1 h-10 sm:h-11 gap-1.5 sm:gap-2 text-xs sm:text-sm" onClick={() => goToStep(1)}>
                      <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Voltar
                    </Button>
                    <Button type="submit" className="flex-1 h-10 sm:h-11 gap-1.5 sm:gap-2 text-xs sm:text-sm btn-gradient" disabled={!isStep2Valid}>
                      Continuar
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  onSubmit={handleSubmit}
                  className="space-y-2.5 sm:space-y-3"
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="instagram" className="text-xs sm:text-sm">Instagram</Label>
                    <ValidatedInput 
                      id="instagram" 
                      placeholder="@seuperfil" 
                      className="h-10 sm:h-11 text-sm" 
                      value={instagram} 
                      onChange={(e) => setInstagram(e.target.value)}
                      icon={<Instagram className="h-4 w-4" />}
                      showValidation={false}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="facebook" className="text-xs sm:text-sm">Facebook</Label>
                    <ValidatedInput 
                      id="facebook" 
                      placeholder="facebook.com/suapagina" 
                      className="h-10 sm:h-11 text-sm" 
                      value={facebook} 
                      onChange={(e) => setFacebook(e.target.value)}
                      icon={<Facebook className="h-4 w-4" />}
                      showValidation={false}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="website" className="text-xs sm:text-sm">Website</Label>
                    <ValidatedInput 
                      id="website" 
                      placeholder="https://seusite.com" 
                      className="h-10 sm:h-11 text-sm" 
                      value={website} 
                      onChange={(e) => setWebsite(e.target.value)}
                      icon={<Globe className="h-4 w-4" />}
                      showValidation={false}
                    />
                  </div>
                  <div className="flex gap-2.5 sm:gap-3 pt-1.5 sm:pt-2">
                    <Button type="button" variant="outline" className="flex-1 h-10 sm:h-11 gap-1.5 sm:gap-2 text-xs sm:text-sm" onClick={() => goToStep(2)}>
                      <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Voltar
                    </Button>
                    <Button type="submit" className="flex-1 h-10 sm:h-11 gap-1.5 sm:gap-2 text-xs sm:text-sm btn-gradient" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Criar Conta
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quer comprar ingressos?{" "}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">
                Cadastrar como participante →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
