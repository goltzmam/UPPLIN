import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CityChangePromptProps {
  /** The newly detected city (e.g. user traveled to another town). */
  detectedCity: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Banner shown when GPS detects the user is in a different city
 * than the previously confirmed one. Asks: "Você está em [City]?"
 */
export function CityChangePrompt({
  detectedCity,
  onConfirm,
  onDismiss,
}: CityChangePromptProps) {
  return (
    <AnimatePresence>
      {detectedCity && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed inset-x-2 z-40 mx-auto max-w-[460px] top-[calc(var(--safe-top)+64px)]"
        >
          <div className="relative rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-3 sm:px-4 sm:py-3">
            <button
              onClick={onDismiss}
              aria-label="Manter cidade atual"
              className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-7">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Você está em {detectedCity}?
                </p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  Atualize sua cidade para ver eventos por aqui.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onConfirm}
              className="h-9 w-full text-xs btn-gradient mt-2.5"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Sim, atualizar cidade
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
