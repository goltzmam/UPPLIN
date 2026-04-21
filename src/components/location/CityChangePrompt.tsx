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
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[min(92vw,460px)] top-[calc(env(safe-area-inset-top,0px)+64px)]"
        >
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Você está em {detectedCity}?
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                Atualize sua cidade para ver eventos por aqui.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={onConfirm}
                className="h-8 px-3 text-xs btn-gradient"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Sim
              </Button>
              <button
                onClick={onDismiss}
                aria-label="Manter cidade atual"
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
