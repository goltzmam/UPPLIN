import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }

      // Verify admin role using the database function
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: session.session.user.id,
          _role: "admin"
        });

        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error("Acesso negado. Você não tem permissão de administrador.");
        }

        toast({ title: "Bem-vindo, Admin!", description: "Acesso liberado." });
        navigate("/admin");
      }
    } catch (err: any) {
      toast({ 
        title: "Erro ao entrar", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
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
                <a 
                  href="/recuperar-senha" 
                  className="text-xs text-primary hover:underline"
                >
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

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-center text-muted-foreground mb-2">
              <strong>Credenciais de Teste:</strong>
            </p>
            <p className="text-xs text-center text-foreground font-mono">
              estefaniomelo@gmail.com
            </p>
            <p className="text-xs text-center text-muted-foreground">
              (use sua senha de admin)
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Acesso restrito. Tentativas não autorizadas serão registradas.
          </p>
        </div>
      </div>
    </div>
  );
}
