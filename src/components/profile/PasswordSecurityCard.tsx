import { useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPublicAppOrigin } from "@/lib/public-origin";

export function PasswordSecurityCard({ organizer = false }: { organizer?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const request = async () => {
    if (!user?.email || pending) return;
    setPending(true);
    try {
      const { error } = await supabase.functions.invoke("request-password-reset", { body: { email: user.email, isOrganizer: organizer, redirectOrigin: getPublicAppOrigin() } });
      if (error) throw error;
      setSent(true);
      toast({ title: "Confira seu email", description: "Enviamos um link seguro para você escolher uma nova senha." });
    } catch {
      toast({ title: "Não foi possível enviar o link", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally { setPending(false); }
  };
  return <section className="rounded-xl border border-border p-4 space-y-3">
    <h3 className="font-semibold">Senha e segurança</h3>
    <p className="text-sm text-muted-foreground">Para alterar sua senha, receba um link de confirmação no email de acesso da sua conta. {organizer ? "Você continuará no fluxo do organizador." : "Você continuará no fluxo do participante."}</p>
    <Button type="button" variant="outline" disabled={pending || sent || !user?.email} onClick={() => void request()}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
      {sent ? "Link enviado para seu email" : "Alterar senha"}
    </Button>
  </section>;
}
