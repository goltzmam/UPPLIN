import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle, MapPin, Ticket, Shield } from "lucide-react";

interface TicketQRCodeProps {
  ticketId: string;
  qrToken: string;
  eventTitle: string;
  ticketType: string;
  date: string;
  venue?: string;
  status: "issued" | "used" | "cancelled";
  className?: string;
}

export function TicketQRCode({
  ticketId,
  qrToken,
  eventTitle,
  ticketType,
  date,
  venue,
  status,
  className,
}: TicketQRCodeProps) {
  const qrValue = JSON.stringify({
    ticketId,
    token: qrToken,
  });

  const isValid = status === "issued";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={cn("relative w-full max-w-[320px] sm:max-w-[360px] mx-auto", className)}
    >
      {/* Main Ticket Card */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl">
        {/* Top gradient header */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-6 pt-6 pb-8">
          {/* Decorative circles */}
          <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-2 left-6 h-12 w-12 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Ticket className="h-4 w-4 text-white" />
              </div>
              <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">UPPLIN Ticket</span>
            </div>
            <h3 className="text-white font-display text-xl font-bold leading-tight mb-2 line-clamp-2">
              {eventTitle}
            </h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{date}</span>
              </div>
              {venue && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tear perforation */}
        <div className="relative">
          <div className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-background z-10" />
          <div className="absolute -right-4 -top-4 h-8 w-8 rounded-full bg-background z-10" />
          <div className="border-t-2 border-dashed border-border mx-8" />
        </div>

        {/* QR Code section */}
        <div className="bg-card px-6 pt-6 pb-5">
          <div className="flex flex-col items-center">
            {/* QR Code */}
            <div className={cn(
              "relative p-3 sm:p-4 rounded-2xl bg-white shadow-sm border border-border/50 mb-4",
              !isValid && "opacity-40 grayscale"
            )}>
              <QRCodeSVG
                value={qrValue}
                size={156}
                level="H"
                includeMargin={false}
                className="h-auto w-full max-w-[180px]"
                imageSettings={{
                  src: "",
                  height: 0,
                  width: 0,
                  excavate: false,
                }}
              />
              {!isValid && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-destructive/90 text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase -rotate-12 shadow-lg">
                    {status === "used" ? "Check-in feito" : "Cancelado"}
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {status === "used" ? (
              <div className="mb-3 flex max-w-[260px] items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-center">
                <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                <span className="text-xs font-semibold text-success">Check-in realizado com sucesso</span>
              </div>
            ) : isValid && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 mb-3"
              >
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">Ingresso verificado</span>
              </motion.div>
            )}

            {/* Ticket info */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
                  <p className="font-display font-bold text-foreground">{ticketType}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pedido</p>
                  <p className="font-mono text-sm font-semibold text-foreground">#{ticketId.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-muted/50 px-6 py-3 flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground text-center">
            {status === "used" ? "Este ingresso já foi validado e não pode ser usado novamente" : "Apresente este QR Code na entrada do evento"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
