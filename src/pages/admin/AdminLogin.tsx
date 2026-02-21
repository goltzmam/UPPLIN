import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Loader2, LogOut } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
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

      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Acesso Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Área restrita para administradores
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@email.com"
                  className="pl-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <a href="/recuperar-senha" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>


          <p className="text-xs text-center text-muted-foreground mt-4">
            Acesso restrito. Tentativas não autorizadas serão registradas.
          </p>
        </div>
      </div>
    </div>
  );
}
