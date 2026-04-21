import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Ticket, Download, ArrowRight, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

export default function PagamentoSucesso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [confettiFired, setConfettiFired] = useState(false);

  // Fire confetti on mount
  useEffect(() => {
    if (!confettiFired) {
      setConfettiFired(true);
      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF6A00", "#FF2D2D", "#FF007A", "#FFD700", "#00FF88"],
      });
      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FF6A00", "#FF2D2D", "#FF007A"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#00FF88", "#FF6A00"],
        });
      }, 300);
    }
  }, [confettiFired]);

  // Fetch recent paid tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["success-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          events(title, start_at, venue_name, cover_image_url),
          ticket_types(name, price_cents)
        `)
        .eq("buyer_user_id", user!.id)
        .eq("status", "issued")
        .order("issued_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TikTokDesktopSidebar />
        <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe">
          <PageLoading />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <TikTokDesktopSidebar />

      <main className="lg:ml-[72px] min-h-screen pb-app-bottom-safe py-8">
        <div className="container max-w-2xl px-4">
          {/* Success Header */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
              Pagamento Confirmado! 🎉
            </h1>
            <p className="text-muted-foreground text-lg">
              Seus ingressos estão prontos
            </p>
          </motion.div>

          {/* Tickets */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 mb-8"
          >
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket: any, i: number) => (
                <motion.div
                  key={ticket.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Event image */}
                    {ticket.events?.cover_image_url && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                        <img
                          src={ticket.events.cover_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{ticket.events?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ticket.events?.start_at &&
                          format(new Date(ticket.events.start_at), "d 'de' MMMM, HH:mm", {
                            locale: ptBR,
                          })}
                      </p>
                      {ticket.events?.venue_name && (
                        <p className="text-sm text-muted-foreground">{ticket.events.venue_name}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Ticket className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {ticket.ticket_types?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dashed separator */}
                  <div className="relative px-4">
                    <div className="border-t-2 border-dashed border-border" />
                    <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-muted/30" />
                    <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-muted/30" />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">QR Code</p>
                      <p className="font-mono text-xs">{ticket.qr_token?.slice(0, 12)}...</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <PartyPopper className="h-3.5 w-3.5" />
                      Confirmado
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Seus ingressos estão sendo processados...</p>
                <p className="text-sm mt-1">Pode levar alguns segundos.</p>
              </div>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              onClick={() => navigate("/meus-ingressos")}
              className="flex-1"
              size="lg"
            >
              <Ticket className="h-5 w-5 mr-2" />
              Meus Ingressos
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/eventos")}
              className="flex-1"
              size="lg"
            >
              Ver mais eventos
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
