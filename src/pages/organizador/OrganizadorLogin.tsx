import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Mail, Lock, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function OrganizadorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/organizador");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center text-secondary-foreground">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Portal do Organizador</h1>
          <p className="text-sm sm:text-base text-secondary-foreground/70">Acesse sua área exclusiva para gerenciar eventos e vendas.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center lg:text-left">
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-6 sm:mb-8">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg sm:text-xl font-bold">Influente</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Building2 className="h-4 w-4" />
              Área do Organizador
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Entrar na sua conta</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Não tem conta?{" "}
              <Link to="/organizador/cadastro" className="text-primary hover:underline font-medium">Criar conta de organizador</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10 h-11 sm:h-12 text-sm sm:text-base" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-11 sm:h-12 text-sm sm:text-base" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
              Entrar como participante →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
