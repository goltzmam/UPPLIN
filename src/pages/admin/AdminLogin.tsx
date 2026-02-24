import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Mail, Lock, Loader2, LogOut, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { checkSessionConflict } from "@/lib/session-guard";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const doAdminSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: session.session.user.id,
          _role: "admin",
        });

        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error("Acesso negado. Você não tem permissão de administrador.");
        }

        toast({ title: "Bem-vindo, Admin!", description: "Acesso liberado." });
        navigate("/admin");
      }
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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

    await doAdminSignIn();
  };

  const handleForceLogin = async () => {
    setConflictEmail(null);
    await signOut();
    await doAdminSignIn();
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
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
              {" "}Para entrar como Admin, você precisa deslogar da conta atual primeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deslogar e entrar como Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Animated background gradient orbs - BLUE/SLATE for Admin */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
          animate={{ scale: [1, 1.2, 1], rotate: [0, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
          animate={{ scale: [1.2, 1, 1.2], rotate: [60, 0, 60] }}
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
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4 mb-5 sm:mb-8">
            <Link to="/" className="inline-block">
              <motion.span
                className="font-display text-2xl sm:text-4xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #6366F1, #8B5CF6)",
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
              style={{ background: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.2)", color: "#3B82F6" }}
            >
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Administração
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Área restrita para administradores.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@email.com"
                  className="pl-10 h-11 sm:h-12 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium">Senha</Label>
                <a href="/recuperar-senha" className="text-[10px] sm:text-xs hover:underline" style={{ color: "#3B82F6" }}>
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 sm:h-12 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-xs sm:text-sm font-medium text-white" 
              style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-4">
            Acesso restrito. Tentativas não autorizadas serão registradas.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
