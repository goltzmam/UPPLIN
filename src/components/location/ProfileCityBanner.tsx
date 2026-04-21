import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileCityBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Discreet banner shown to logged-in users who haven't filled in
 * their city yet. Encourages completion without forcing it.
 */
export function ProfileCityBanner({
  visible,
  onDismiss,
}: ProfileCityBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="fixed inset-x-2 z-40 mx-auto max-w-[420px] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0"
          style={{ bottom: "calc(var(--app-bottom-offset, 100px) + 12px)" }}
        >
          <div className="relative rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-3 sm:px-4 sm:py-3">
            <button
              onClick={onDismiss}
              aria-label="Dispensar"
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
                  Adicione sua cidade
                </p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  Receba eventos da sua região mesmo sem GPS.
                </p>
              </div>
            </div>
            <Link
              to="/perfil?tab=configuracoes"
              onClick={onDismiss}
              className="h-9 w-full text-xs btn-gradient inline-flex items-center justify-center rounded-md font-medium text-white mt-2.5"
            >
              Completar perfil
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
