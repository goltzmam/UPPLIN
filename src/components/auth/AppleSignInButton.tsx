import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, translateAuthError } from "@/lib/auth";
import { signInWithOAuth } from "@/lib/oauth";
import { useToast } from "@/hooks/use-toast";

export function AppleSignInButton({ redirectTo, disabled = false }: { redirectTo: string; disabled?: boolean }) {
  const { appleEnabled, authReady } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const signIn = async () => {
    setPending(true);
    try {
      const { error } = await signInWithOAuth("apple", { redirect_uri: redirectTo });
      if (error) throw error;
    } catch (error) {
      toast({ title: "Erro ao entrar com Apple", description: translateAuthError(error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente."), variant: "destructive" });
    } finally {
      setPending(false);
    }
  };
  return <Button type="button" variant="outline" onClick={() => void signIn()}
    disabled={disabled || pending || !authReady || !appleEnabled}
    title={!appleEnabled ? "Indisponível no momento" : undefined}
    className="mt-3 w-full h-11 sm:h-12 gap-2 border-white/20 bg-black text-white hover:bg-zinc-900 hover:text-white text-xs sm:text-sm font-medium">
    {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> :
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.03 3.17 2.78 4.22 2.81 4.23-.02.08-.44 1.51-1.45 2.99-.87 1.28-1.78 2.55-3.2 2.58-1.4.03-1.85-.83-3.46-.83-1.61 0-2.11.8-3.44.86-1.37.05-2.42-1.39-3.3-2.67-1.8-2.62-3.17-7.41-1.32-10.65a5.1 5.1 0 0 1 4.32-2.62c1.35-.03 2.62.92 3.45.92.82 0 2.37-1.14 4-0.97.68.03 2.58.28 3.8 2.07-.1.06-2.27 1.32-2.24 4.09ZM14.42 4.65c.73-.88 1.23-2.1 1.1-3.32-1.06.04-2.36.71-3.12 1.59-.68.78-1.28 2.03-1.12 3.23 1.18.09 2.39-.6 3.14-1.5Z" /></svg>}
    Continuar com Apple
  </Button>;
}
