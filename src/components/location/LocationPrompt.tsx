import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Loader2 } from "lucide-react";
import { useUserLocation } from "@/hooks/use-user-location";
import { cn } from "@/lib/utils";

/**
 * Banner discreto que aparece uma única vez para solicitar
 * permissão de localização. Aparece no topo da tela (acima do
 * header do feed), com gradiente neon UPPLIN.
 *
 * Não usa `toast` — segue a política de não emitir toasts em
 * páginas sociais/públicas (ver mem://style/toast-notification-policy).
 */
export function LocationPrompt() {
  const { shouldPrompt, status, requestLocation, dismissPrompt } = useUserLocation();

  const isLoading = status === "loading";
  const visible = shouldPrompt || isLoading;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={cn(
            "fixed left-0 right-0 z-[60] pointer-events-none",
            "top-[env(safe-area-inset-top,0px)]"
          )}
        >
          <div className="px-3 pt-2 lg:pt-3 lg:px-4 pointer-events-auto">
            <div
              className="mx-auto max-w-md rounded-2xl border border-white/10 bg-background/85 backdrop-blur-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-live="polite"
              aria-label="Permitir localização"
            >
              {/* Top neon gradient bar */}
              <div
                className="h-[3px] w-full"
                style={{
                  background:
                    "linear-gradient(90deg, #FF6A00, #FF2D2D, #FF007A)",
                }}
              />

              <div className="p-3 sm:p-4 flex items-start gap-3">
                <div
                  className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,106,0,0.18), rgba(255,0,122,0.18))",
                  }}
                >
                  <MapPin className="h-5 w-5 text-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    Eventos perto de você
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    Permita o acesso à sua localização para descobrir e priorizar
                    eventos na sua região.
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={isLoading}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5",
                        "h-8 px-3 rounded-full text-xs font-semibold",
                        "text-white shadow-md transition-transform active:scale-95 disabled:opacity-70",
                      )}
                      style={{
                        background:
                          "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Localizando...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5" />
                          Permitir
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={dismissPrompt}
                      disabled={isLoading}
                      className="h-8 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      Agora não
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissPrompt}
                  aria-label="Fechar"
                  disabled={isLoading}
                  className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
