import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Mail, Lock, Loader2, Ticket, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailRules = useMemo(() => [{ test: isValidEmail }], []);
  const passwordRules = useMemo(() => [{ test: (v: string) => v.length >= 1 }], []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
    }
  };

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

      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center text-secondary-foreground">
          <div className="flex justify-center mb-6 sm:mb-8">
            <span 
              className="font-display text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ 
                background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              UPPLIN
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Bem-vindo de volta!</h1>
          <p className="text-sm sm:text-base text-secondary-foreground/70">Entre para ver seus ingressos e descobrir novos eventos.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <span 
                className="font-display text-2xl font-bold tracking-tight"
                style={{ 
                  background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                UPPLIN
              </span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-foreground text-sm font-medium">
              <Ticket className="h-4 w-4" />
              Participante
            </div>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Entrar na sua conta</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">Criar conta</Link>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Link 
                  to="/recuperar-senha" 
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
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
            </div>
            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">É organizador de eventos?</p>
            <Link 
              to="/organizador/login" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Entrar como organizador →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
