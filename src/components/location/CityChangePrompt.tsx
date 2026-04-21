import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check } from "lucide-react";
import { useUserLocation } from "@/hooks/use-user-location";
import { cn } from "@/lib/utils";

/**
 * Banner de detecção automática de mudança de cidade.
 *
 * Aparece quando o reverse-geocode detecta que o usuário está em uma
 * cidade diferente da última cidade ativa (ex.: viajou de Fortaleza
 * para Recife). Mostra abaixo do header, com gradiente UPPLIN.
 */
export function CityChangePrompt() {
  const { pendingCity, activeCity, confirmCity, rejectCity } = useUserLocation();

  const visible = !!pendingCity;
  const cityLabel = pendingCity
    ? [pendingCity.name, pendingCity.state].filter(Boolean).join(" - ")
    : "";

  return (
    <AnimatePresence>
      {visible && pendingCity && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={cn(
            "fixed left-0 right-0 z-[55] pointer-events-none",
            // posicionado abaixo do LocationPrompt (que tem z-60)
            "top-[calc(env(safe-area-inset-top,0px)+8px)] lg:top-[calc(env(safe-area-inset-top,0px)+12px)]",
          )}
        >
          <div className="px-3 lg:px-4 pointer-events-auto">
            <div
              className="mx-auto max-w-md rounded-2xl border border-white/10 bg-background/85 backdrop-blur-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-live="polite"
              aria-label="Confirmar cidade atual"
            >
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
                    Você está em {cityLabel}?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {activeCity?.name
                      ? `Detectamos uma mudança de ${activeCity.name}. Atualizar para ver eventos em ${pendingCity.name}.`
                      : `Atualize para ver eventos em ${pendingCity.name}.`}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => confirmCity()}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5",
                        "h-8 px-3 rounded-full text-xs font-semibold",
                        "text-white shadow-md transition-transform active:scale-95",
                      )}
                      style={{
                        background:
                          "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Sim, atualizar
                    </button>
                    <button
                      type="button"
                      onClick={rejectCity}
                      className="h-8 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      Não, manter
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={rejectCity}
                  aria-label="Fechar"
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
