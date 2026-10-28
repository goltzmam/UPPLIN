import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn, user } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  useEffect(() => { if (user && isAdmin && !rolesLoading) navigate("/", { replace: true }); }, [user, isAdmin, rolesLoading, navigate]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const { error: signInError } = await signIn(email.trim().toLowerCase(), password);
      if (signInError) throw signInError;
      const { data: { user: account } } = await supabase.auth.getUser();
      if (!account) throw new Error("Não foi possível validar a sessão.");
      const { data: allowed, error: roleError } = await supabase.rpc("has_role", { _user_id: account.id, _role: "admin" });
      if (roleError || !allowed) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Esta conta não tem acesso à administração.");
      }
      navigate("/", { replace: true });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível entrar."); }
    finally { setLoading(false); }
  };
  return <main className="min-h-dvh bg-[#09090b] text-white flex items-center justify-center p-6">
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101014] p-7 sm:p-9 shadow-2xl">
      <img src="/upplin-icon.svg" alt="UPPLIN" className="h-14 w-14 mb-7" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500"><Shield className="h-3.5 w-3.5" /> Acesso restrito</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Administração UPPLIN</h1>
      <p className="mt-2 text-sm text-zinc-500">Entre com sua conta administrativa.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><Input id="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div>
        <div className="space-y-2"><Label htmlFor="admin-password">Senha</Label><div className="relative"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-11 h-11" required /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-3.5 text-zinc-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="h-11 w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}</Button>
      </form>
    </div>
  </main>;
}
