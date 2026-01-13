import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TicketQRCodeProps {
  ticketId: string;
  qrToken: string;
  eventTitle: string;
  ticketType: string;
  date: string;
  status: "issued" | "used" | "cancelled";
  className?: string;
}

export function TicketQRCode({
  ticketId,
  qrToken,
  eventTitle,
  ticketType,
  date,
  status,
  className,
}: TicketQRCodeProps) {
  const qrValue = JSON.stringify({
    ticketId,
    token: qrToken,
    timestamp: Date.now(),
  });

  const statusConfig = {
    issued: {
      label: "Válido",
      bgColor: "bg-success/10",
      textColor: "text-success",
      borderColor: "border-success/30",
    },
    used: {
      label: "Utilizado",
      bgColor: "bg-muted",
      textColor: "text-muted-foreground",
      borderColor: "border-border",
    },
    cancelled: {
      label: "Cancelado",
      bgColor: "bg-destructive/10",
      textColor: "text-destructive",
      borderColor: "border-destructive/30",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border-2 bg-card",
        config.borderColor,
        status !== "issued" && "opacity-75",
        className
      )}
    >
      {/* Ticket Header */}
      <div className="bg-secondary px-6 py-4">
        <h3 className="font-display text-lg font-bold text-secondary-foreground truncate">
          {eventTitle}
        </h3>
        <p className="text-sm text-secondary-foreground/70">{date}</p>
      </div>

      {/* QR Code Section */}
      <div className="p-6 flex flex-col items-center">
        <div className={cn(
          "p-4 rounded-2xl bg-white mb-4",
          status !== "issued" && "filter grayscale"
        )}>
          <QRCodeSVG
            value={qrValue}
            size={160}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Ticket Type Badge */}
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-2",
          config.bgColor,
          config.textColor
        )}>
          <span className={cn(
            "h-2 w-2 rounded-full",
            status === "issued" && "bg-success animate-pulse",
            status === "used" && "bg-muted-foreground",
            status === "cancelled" && "bg-destructive"
          )} />
          {config.label}
        </div>

        <p className="text-lg font-semibold">{ticketType}</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          #{ticketId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
        <div className="h-8 w-8 rounded-full bg-background" />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
        <div className="h-8 w-8 rounded-full bg-background" />
      </div>

      {/* Dashed Line */}
      <div className="absolute left-8 right-8 top-[calc(50%+24px)] border-t-2 border-dashed border-border" />
    </motion.div>
  );
}
