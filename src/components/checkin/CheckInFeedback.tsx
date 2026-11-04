import { CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CheckInFeedbackProps {
  result: {
    success: boolean;
    message: string;
    ticket?: any;
  } | null;
  className?: string;
}

function FeedbackCard({ result, compact = false }: { result: NonNullable<CheckInFeedbackProps["result"]>; compact?: boolean }) {
  const profile = result.ticket?.profiles;
  const ticketType = result.ticket?.ticket_types?.name;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 bg-card shadow-xl",
        compact ? "p-3" : "p-5",
        result.success ? "border-success/60" : "border-destructive/60"
      )}
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
        {result.success ? (
          <CheckCircle className={cn("shrink-0 text-success", compact ? "h-10 w-10" : "h-12 w-12")} />
        ) : (
          <XCircle className={cn("shrink-0 text-destructive", compact ? "h-10 w-10" : "h-12 w-12")} />
        )}
      </motion.div>

      <div className="min-w-0 flex-1">
        <p className={cn("font-display font-bold", compact ? "text-base" : "text-lg")}>
          {result.success ? "Entrada liberada!" : "Não autorizado"}
        </p>
        <p className="text-sm text-muted-foreground">{result.message}</p>

        {result.success && result.ticket && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarImage src={profile?.photo_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(profile?.full_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile?.full_name || "Participante"}</p>
              {profile?.email && <p className="truncate text-xs text-muted-foreground">{profile.email}</p>}
              {ticketType && <p className="mt-0.5 text-xs font-medium text-primary">{ticketType}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckInFeedback({ result, className }: CheckInFeedbackProps) {
  return (
    <AnimatePresence>
      {result && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            className="fixed inset-x-3 top-[calc(var(--safe-top)+0.75rem)] z-50 md:hidden"
          >
            <FeedbackCard result={result} compact />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={cn("hidden md:block", className)}
          >
            <FeedbackCard result={result} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}