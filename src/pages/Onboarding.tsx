import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Check, ArrowRight, ArrowLeft, Shield, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { translateCpfError } from "@/lib/cpfErrors";
import { validateCpfBeforeSave } from "@/lib/cpfValidation";

export default function Onboarding() {
  const { user, profile, updateProfile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Redirect if not authenticated or already has CPF
  if (!loading && !user) {
    navigate("/login");
    return null;
  }

  if (!loading && profile?.cpf) {
    navigate("/");
    return null;
  }

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const validateCpf = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    
    // Check for repeated digits
    if (/^(\d)\1{10}$/.test(digits)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[10])) return false;
    
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);

    // Pré-validação: formato, conexão e duplicidade — sempre em pt-BR
    const pre = await validateCpfBeforeSave(cpf, { ignoreUserId: user?.id });
    if (pre.ok === false) {
      toast({
        title: pre.title,
        description: pre.description,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const { error } = await updateProfile({
      cpf: pre.digits,
    });

    if (error) {
      const { title, description } = translateCpfError(error, "profile");
      toast({ title, description, variant: "destructive" });
      setSaving(false);
      return;
    }

    await refreshProfile();
    setStep(2);
    
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const features = [
    {
      icon: Ticket,
      title: "Compra Segura",
      description: "Ingressos vinculados ao seu CPF garantem autenticidade",
    },
    {
      icon: Shield,
      title: "Proteção Antifraude",
      description: "Verificação de identidade na entrada dos eventos",
    },
    {
      icon: CreditCard,
      title: "Reembolso Facilitado",
      description: "Processo simplificado em caso de cancelamentos",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/95 to-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {step === 1 ? (
          <div className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-6 text-center" style={{ background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)" }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mb-4"
              >
                <h2 
                  className="font-display text-3xl font-bold tracking-tight text-white"
                >
                  UPPLIN
                </h2>
              </motion.div>
              <h1 className="font-display text-2xl font-bold text-white mb-2">
                Complete seu cadastro
              </h1>
              <p className="text-white/80 text-sm">
                Para sua segurança, precisamos do seu CPF
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Benefits */}
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CPF Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <Label htmlFor="cpf" className="text-sm font-medium">
                  Seu CPF
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="pl-12 h-14 text-lg rounded-xl"
                    autoComplete="off"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O CPF é obrigatório e não poderá ser alterado depois.
                </p>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Button
                  onClick={handleSubmit}
                  disabled={saving || cpf.replace(/\D/g, "").length !== 11}
                  className="w-full h-14 text-lg rounded-xl"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Agora não, explorar a plataforma
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Você poderá cadastrar o CPF mais tarde, antes de comprar ingressos.
                </p>
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl shadow-2xl border border-border p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="h-10 w-10 text-success" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold mb-2">
              Tudo pronto!
            </h1>
            <p className="text-muted-foreground mb-4">
              Seu cadastro foi concluído com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecionando para a página inicial...
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
