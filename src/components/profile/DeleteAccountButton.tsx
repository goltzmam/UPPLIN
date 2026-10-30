import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, translateAuthError } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/lib/oauth";
import { buildPublicAppUrl } from "@/lib/public-origin";

export function DeleteAccountButton() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("excluir") === "1");
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const emailLogin = user?.identities?.some(identity => identity.provider === "email");
  const social = user?.identities?.some(identity => identity.provider === "apple") ? "apple" : user?.identities?.some(identity => identity.provider === "google") ? "google" : null;
  const needsPassword = emailLogin && !social;
  useEffect(() => { if (!open) { setConfirmation(""); setPassword(""); setError(""); } }, [open]);
  const authenticate = async () => {
    if (!social) return;
    const target = new URL(buildPublicAppUrl(location.pathname + location.search));
    if (location.pathname === "/perfil") target.searchParams.set("tab", "config");
    target.searchParams.set("excluir", "1");
    const result = await signInWithOAuth(social, { redirect_uri: target.toString() });
    if (result.error) setError("Não foi possível entrar novamente. Tente outra vez.");
  };
  const remove = async () => {
    if (!user || confirmation !== "EXCLUIR") return;
    setPending(true);setError("");
    try {
      if (needsPassword) {
        if (!password) throw new Error("Informe sua senha atual para confirmar.");
        const result = await supabase.auth.signInWithPassword({ email: user.email || "", password });
        if (result.error) throw new Error(translateAuthError(result.error.message));
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (social === "apple" && session?.provider_refresh_token) {
        const stored = await supabase.functions.invoke("store-apple-token", { body: { refresh_token: session.provider_refresh_token } });
        if (stored.error) throw new Error("Não conseguimos validar seu login Apple. Entre novamente com Apple ou fale com suporte@upplin.com.");
      }
      const result = await supabase.functions.invoke("delete-account", { body: { confirmation } });
      if (result.error || !result.data?.job_id) {
        let code = result.data?.error;
        if (result.error && "context" in result.error && result.error.context instanceof Response) code = (await result.error.context.json().catch(() => ({}))).error;
        if (code === "recent_login_required") throw new Error("Por segurança, entre novamente na conta antes de confirmar a exclusão.");
        if (String(code).startsWith("apple_")) throw new Error("Não conseguimos validar seu login Apple. Entre novamente com Apple ou fale com suporte@upplin.com.");
        throw new Error("Não foi possível iniciar a exclusão. Tente novamente ou entre em contato com o suporte.");
      }
      sessionStorage.setItem("upplin:deletion-receipt", JSON.stringify({ job_id: result.data.job_id, receipt: result.data.receipt }));
      await supabase.auth.signOut({ scope: "local" });
      // Start the public page with no protected-route effects left in flight.
      window.location.replace("/excluir-conta?solicitacao=1");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Tente novamente."); }
    finally { setPending(false);setPassword(""); }
  };
  return <section className="rounded-xl border border-destructive/30 p-4 space-y-3">
    <h3 className="font-semibold">Excluir conta</h3><p className="text-sm text-muted-foreground">Apague sua conta, perfil e conteúdo pessoal. A exclusão é permanente e inclui o perfil de organizador, se houver.</p>
    <Button type="button" variant="destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4 mr-2" />Excluir conta</Button>
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Excluir sua conta UPPLIN?</DialogTitle><DialogDescription>Essa ação é permanente. Você perderá o acesso ao perfil de participante e ao de organizador, aos conteúdos e aos ingressos na conta.</DialogDescription></DialogHeader>
      <p className="text-sm">Fotos, vídeos e dados pessoais serão apagados. Pedidos, ingressos e pagamentos mínimos ficam guardados pelo prazo legal de 5 anos. Registros de acesso ficam por 6 meses.</p>
      <p className="text-sm">Assinaturas ativas serão canceladas antes da exclusão. Dados que o Mercado Pago já recebeu seguem a política dele.</p>
      {social && <Button type="button" variant="outline" onClick={() => void authenticate()} disabled={pending}>Entrar novamente com {social === "apple" ? "Apple" : "Google"}</Button>}
      {needsPassword && <div className="space-y-2"><Label htmlFor="delete-account-password">Senha atual</Label><Input id="delete-account-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={pending} /></div>}
      <div className="space-y-2"><Label htmlFor="delete-account-confirmation">Digite EXCLUIR para confirmar</Label><Input id="delete-account-confirmation" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={pending} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button><Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending || confirmation !== "EXCLUIR" || (!!needsPassword && !password)}>{pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Confirmar exclusão</Button></div>
    </DialogContent></Dialog>
  </section>;
}
