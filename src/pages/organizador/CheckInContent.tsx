import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, CheckCircle, XCircle, Search, Ticket, User, Calendar, Keyboard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRScanner } from "@/components/checkin/QRScanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/feedback";

interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: any;
}

export default function CheckInContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["organizer-events-checkin", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_at, status")
        .eq("organizer_id", organizer!.id)
        .eq("status", "published")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizer,
  });

  const { data: eventTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["event-tickets", selectedEvent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_types(name),
          profiles:buyer_user_id(full_name, email)
        `)
        .eq("event_id", selectedEvent)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEvent,
  });

  const checkInMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: ticket, error: findError } = await supabase
        .from("tickets")
        .select(`*, ticket_types(name), events(title, organizer_id)`)
        .eq("id", ticketId)
        .maybeSingle();

      if (findError || !ticket) {
        throw new Error("Ingresso não encontrado");
      }

      if (ticket.events?.organizer_id !== organizer?.id) {
        throw new Error("Você não tem permissão para validar este ingresso");
      }

      if (ticket.status === "used") {
        throw new Error("Este ingresso já foi utilizado");
      }

      if (ticket.status === "cancelled") {
        throw new Error("Este ingresso foi cancelado");
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      return ticket;
    },
    onSuccess: (ticket) => {
      setCheckInResult({ success: true, message: "Check-in realizado com sucesso!", ticket });
      refetchTickets();
      triggerFeedback({ sound: "success", haptic: "success" });
      toast({ title: "✅ Check-in realizado!", description: ticket.ticket_types?.name });
      setTimeout(() => setCheckInResult(null), 4000);
    },
    onError: (error: any) => {
      setCheckInResult({ success: false, message: error.message });
      triggerFeedback({ sound: "tap", haptic: "error" });
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setTimeout(() => setCheckInResult(null), 4000);
    },
  });

  const processCode = useCallback((code: string) => {
    let ticketId = code.trim();
    try {
      const parsed = JSON.parse(code);
      ticketId = parsed.ticketId || parsed.id || code;
    } catch {
      // Not JSON, use as-is
    }
    checkInMutation.mutate(ticketId);
  }, [checkInMutation]);

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    processCode(manualCode);
    setManualCode("");
  };

  const checkedIn = eventTickets.filter(t => t.status === "used").length;
  const total = eventTickets.length;
  const pending = eventTickets.filter(t => t.status === "issued").length;
  const progressPercent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Check-in</h1>
        <p className="text-sm text-muted-foreground">Valide os ingressos na entrada do evento</p>
      </div>

      {/* Event Selector */}
      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Selecione o evento</label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title} — {format(new Date(event.start_at), "dd/MM/yyyy", { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEvent && (
        <>
          {/* Stats with progress */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm">Progresso do Check-in</h3>
              <span className="text-2xl font-bold font-display text-primary">{progressPercent}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{checkedIn}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Validados</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{pending}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{total}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Check-in Result Overlay */}
          <AnimatePresence>
            {checkInResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className={cn(
                  "p-5 rounded-2xl flex items-center gap-4 border-2",
                  checkInResult.success
                    ? "bg-green-50 dark:bg-green-950/30 border-green-500/40"
                    : "bg-red-50 dark:bg-red-950/30 border-destructive/40"
                )}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                >
                  {checkInResult.success ? (
                    <CheckCircle className="h-12 w-12 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-12 w-12 text-destructive shrink-0" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg">{checkInResult.success ? "Entrada liberada!" : "Não autorizado"}</p>
                  <p className="text-sm text-muted-foreground">{checkInResult.message}</p>
                  {checkInResult.ticket && (
                    <p className="text-sm font-medium mt-1">{checkInResult.ticket.ticket_types?.name}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanner / Manual tabs */}
          <Tabs defaultValue="scanner" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="scanner" className="flex-1 gap-2">
                <QrCode className="h-4 w-4" />
                Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-2">
                <Keyboard className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner">
              <Card>
                <CardContent className="p-4">
                  <QRScanner
                    onScan={processCode}
                    isProcessing={checkInMutation.isPending}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Digite o código do ingresso ou cole o conteúdo do QR Code
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código do ingresso..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualCheckIn()}
                      className="flex-1"
                    />
                    <Button onClick={handleManualCheckIn} disabled={!manualCode.trim() || checkInMutation.isPending}>
                      <Search className="h-4 w-4 mr-2" />
                      Validar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Tickets List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Lista de Ingressos ({total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventTickets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum ingresso vendido para este evento
                  </p>
                ) : (
                  eventTickets.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors",
                        ticket.status === "used" && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                          ticket.status === "used" ? "bg-green-100 dark:bg-green-950/30" : "bg-primary/10"
                        )}>
                          {ticket.status === "used" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {ticket.profiles?.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ticket.ticket_types?.name} · #{ticket.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.status === "used" ? (
                          <Badge variant="secondary" className="text-xs">Validado</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => checkInMutation.mutate(ticket.id)}
                            disabled={checkInMutation.isPending}
                          >
                            Check-in
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
