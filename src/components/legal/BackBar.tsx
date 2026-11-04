import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasInAppHistory } from "@/lib/back-navigation";

/**
 * Barra fixa de voltar (o iOS não tem botão de voltar do sistema).
 * É `fixed`, como o Header do app: com o `overflow-x: hidden` do #root
 * (index.css), um `sticky` rola junto com a página.
 * `sidebarGap`: a página tem `lg:ml-[72px]`; a barra acompanha no desktop.
 */
export function BackBar({ fallback = "/", sidebarGap = false }: { fallback?: string; sidebarGap?: boolean }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (hasInAppHistory(window.history.state)) navigate(-1);
    else navigate(fallback);
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur pt-[var(--safe-top)]",
          sidebarGap && "lg:left-[72px]",
        )}
      >
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
      <div aria-hidden="true" className="h-[calc(var(--safe-top)_+_45px)]" />
    </>
  );
}
