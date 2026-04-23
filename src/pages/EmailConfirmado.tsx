import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const clearAuthParamsFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  ["access_token", "refresh_token", "expires_in", "token_type", "type", "token_hash", "error", "error_code", "error_description"].forEach((key) => {
    searchParams.delete(key);
  });

  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
  window.history.replaceState({}, document.title, nextUrl);
};

export default function EmailConfirmado() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const errorMessage = useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);

    const rawError = hashParams.get("error_description")
      ?? queryParams.get("error_description")
      ?? hashParams.get("error")
      ?? queryParams.get("error");

    if (!rawError) return "Esse link é inválido ou já expirou. Solicite um novo e-mail de confirmação.";
    if (/expired|invalid|not found/i.test(rawError)) return "Esse link é inválido ou já expirou. Solicite um novo e-mail de confirmação.";

    return "Não foi possível confirmar seu e-mail agora. Tente novamente em instantes.";
  }, []);

  useEffect(() => {
    const finalizeConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const queryParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
        const error = hashParams.get("error") ?? queryParams.get("error");

        if (error) {
          setStatus("error");
          clearAuthParamsFromUrl();
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus("error");
            clearAuthParamsFromUrl();
            return;
          }

          await supabase.auth.signOut();
        }

        clearAuthParamsFromUrl();
        setStatus("success");
      } catch {
        clearAuthParamsFromUrl();
        setStatus("error");
      }
    };

    void finalizeConfirmation();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-2xl space-y-6">
        {status === "loading" ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-foreground">Confirmando seu e-mail</h1>
              <p className="text-sm text-muted-foreground">Estamos validando seu acesso para liberar sua conta.</p>
            </div>
          </>
        ) : status === "success" ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Bem-vindo</p>
              <h1 className="font-display text-2xl font-bold text-foreground">E-mail confirmado com sucesso</h1>
              <p className="text-sm text-muted-foreground">
                Sua conta já está ativa. Agora faça login para seguir para o onboarding e terminar seu cadastro.
              </p>
            </div>
            <div className="space-y-3">
              <Button asChild className="w-full btn-gradient">
                <Link to="/login?confirmado=1">Fazer login e continuar</Link>
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <MailCheck className="h-4 w-4" />
                Seu próximo passo é entrar na conta para continuar.
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlert className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-foreground">Não foi possível confirmar</h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <div className="space-y-3">
              <Button asChild className="w-full btn-gradient">
                <Link to="/cadastro">Criar conta novamente</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ir para login</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}