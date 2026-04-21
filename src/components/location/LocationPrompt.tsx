import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationPromptProps {
  visible: boolean;
  requesting?: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

/**
 * Discreet, non-blocking banner asking the user to share their location
 * so the feed can prioritize nearby events.
 */
export function LocationPrompt({
  visible,
  requesting,
  onAllow,
  onDismiss,
}: LocationPromptProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
          style={{ bottom: "calc(var(--app-bottom-offset, 100px) + 12px)" }}
        >
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Eventos perto de você
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                Permita o acesso à localização para priorizar o que está
                rolando na sua cidade.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={onAllow}
                disabled={requesting}
                className="h-8 px-3 text-xs btn-gradient"
              >
                {requesting ? "..." : "Permitir"}
              </Button>
              <button
                onClick={onDismiss}
                aria-label="Dispensar"
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
