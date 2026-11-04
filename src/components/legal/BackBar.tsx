import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { hasInAppHistory } from "@/lib/back-navigation";

/** Barra fixa de voltar (o iOS não tem botão de voltar do sistema). */
export function BackBar({ fallback = "/" }: { fallback?: string }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (hasInAppHistory(window.history.state)) navigate(-1);
    else navigate(fallback);
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur pt-[var(--safe-top)]">
      <div className="mx-auto flex w-full max-w-3xl items-center px-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Voltar"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
    </div>
  );
}
