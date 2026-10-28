import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Loader2, Building2, Phone, Globe, Instagram, Facebook, FileText, ChevronRight, ChevronLeft, Check, PartyPopper, ArrowLeft, LogOut, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput } from "@/components/ui/validated-input";
import { PasswordRequirementsChecklist } from "@/components/auth/PasswordRequirementsChecklist";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/lib/oauth";
import { useAuth, translateAuthError } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { buildPublicAppUrl } from "@/lib/public-origin";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [useExistingAccount, setUseExistingAccount] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, googleEnabled } = useAuth();
  const { logout, loggingOut } = useLogout({ redirectTo: "/organizador/cadastro", showToast: false });

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
  // When using an existing logged-in account, step 1 is bypassed.
  const isStep1Valid = useExistingAccount
    ? true
    : isValidName(fullName) && isValidEmail(email) && isValidPassword(password);
  const isStep2Valid = companyName.trim().length >= 2 && isValidCNPJ(cnpj) && isValidPhone(phone);

  // Pre-fill from current session when user opts to reuse their account.
  useEffect(() => {
    if (useExistingAccount && user) {
      if (!fullName) setFullName(profile?.full_name || user.user_metadata?.full_name || "");
      if (!email) setEmail(user.email || "");
    }
  }, [useExistingAccount, user, profile, fullName, email]);

  // If user already has an organizer account, send them to the dashboard.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("organizer_accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) {
        navigate("/organizador/painel", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithOAuth("google", {
        redirect_uri: buildPublicAppUrl("/organizador/onboarding"),
      });
      if (error) {
        const msg = translateAuthError(String((error as any)?.message ?? error));
        toast({ title: "Erro ao entrar com Google", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: translateAuthError(err?.message ?? "Não foi possível continuar."), variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
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
      // Determine the user we will attach the organizer account to.
      let ownerUserId: string | null = null;
      let ownerEmail: string = email;

      if (useExistingAccount && user) {
        // Reuse the currently logged-in user — DO NOT call signUp.
        ownerUserId = user.id;
        ownerEmail = user.email || email;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildPublicAppUrl("/email-confirmado"),
            data: { full_name: fullName },
          },
        });

        if (authError) {
          if (/weak password|known to be weak|easy to guess|pwned/i.test(authError.message)) {
            throw new Error("Use uma senha mais forte com letras maiúsculas, minúsculas, números e caractere especial.");
          }
          if (/email not confirmed/i.test(authError.message)) {
            throw new Error("Confirme seu e-mail para continuar.");
          }
          if (/user already registered|already registered/i.test(authError.message)) {
            throw new Error("Já existe uma conta com esse e-mail.");
          }
          throw authError;
        }
        ownerUserId = authData?.user?.id ?? null;
      }

      if (!ownerUserId) {
        throw new Error("Não foi possível identificar o usuário. Tente novamente.");
      }

      // Add organizer role (idempotent — ignore duplicate).
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: ownerUserId, role: "organizer" });

      if (roleError && !/duplicate|unique/i.test(roleError.message)) {
        console.error("Role error:", roleError);
      }

      // Create the organizer account.
      const { error: orgError } = await supabase
        .from("organizer_accounts")
        .insert({
          owner_user_id: ownerUserId,
          display_name: companyName,
          cnpj: cnpj.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
          email: ownerEmail,
          description,
          social_instagram: instagram,
          social_facebook: facebook,
          social_website: website,
        });

      if (orgError) {
        // Friendlier message if the user already has an org account.
        if (/duplicate|unique/i.test(orgError.message)) {
          toast({
            title: "Você já tem uma conta de organizador",
            description: "Redirecionando para o painel...",
          });
          setTimeout(() => navigate("/organizador/painel"), 1200);
          return;
        }
        throw orgError;
      }

      // Send welcome email for organizer (best-effort)
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "welcome_organizer",
            to: ownerEmail,
            data: { userName: fullName, companyName },
          },
        });
      } catch (err) {
        console.warn("Welcome email failed (non-critical):", err);
      }

      setShowSuccess(true);
      triggerConfetti();

      toast({
        title: useExistingAccount ? "Conta atualizada!" : "Conta criada com sucesso!",
        description: "Vamos configurar seu perfil.",
      });

      setTimeout(() => {
        navigate("/organizador/painel");
      }, 2500);
    } catch (err: any) {
      toast({
        title: "Erro ao criar conta",
        description: err.message,
        variant: "destructive",
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
    <div className="min-h-[100dvh] bg-background flex items-start sm:items-center justify-center px-4 pt-14 pb-16 sm:p-6 relative">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">
                {useExistingAccount ? "Tornar-se organizador" : "Criar conta de organizador"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {useExistingAccount ? (
                  "Vamos configurar sua produtora."
                ) : (
                  <>
                    Já tem conta?{" "}
                    <Link to="/organizador/login" className="text-primary hover:underline font-medium">Entrar</Link>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Active session banner — only when a participant is logged in and hasn't chosen yet */}
          {user && !useExistingAccount && (
            <div className="mb-4 sm:mb-5 p-3 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-2.5">
                <UserCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    Você já está logado como{" "}
                    <span className="font-semibold break-all">{user.email}</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    Quer tornar esta conta um organizador ou criar uma conta separada?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs btn-gradient"
                      onClick={() => {
                        setUseExistingAccount(true);
                        goToStep(2);
                      }}
                    >
                      Usar esta conta
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => logout()}
                      disabled={loggingOut}
                    >
                      {loggingOut ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Sair e criar outra
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      placeholder="Crie uma senha forte" 
                      className="h-10 sm:h-11 text-sm" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      minLength={8}
                      icon={<Lock className="h-4 w-4" />}
                      validationRules={passwordRules}
                    />
                    <PasswordRequirementsChecklist password={password} />
                  </div>
                  <Button type="submit" className="w-full h-10 sm:h-11 gap-2 text-xs sm:text-sm btn-gradient" disabled={!isStep1Valid}>
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isStep1Valid ? (
                    <p className="text-[11px] sm:text-xs text-muted-foreground text-center">
                      Preencha todos os campos e atenda a todos os requisitos da senha para continuar.
                    </p>
                  ) : null}

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Google Sign Up */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm gap-2"
                    onClick={handleGoogleSignUp}
                    disabled={googleLoading || !googleEnabled}
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
                    Cadastrar com Google
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
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-10 sm:h-11 gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      onClick={() => {
                        if (useExistingAccount) setUseExistingAccount(false);
                        goToStep(1);
                      }}
                    >
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
