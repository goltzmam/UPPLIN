import { useState, useCallback, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, CheckCircle, Search, Ticket, User, Calendar, Keyboard } from "lucide-react";
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
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/feedback";
import confetti from "canvas-confetti";
import { CollaboratorManager } from "@/components/checkin/CollaboratorManager";
import { CheckInReport } from "@/components/checkin/CheckInReport";
import { getCheckInErrorMessage } from "@/lib/checkin";
import { CheckInFeedback } from "@/components/checkin/CheckInFeedback";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: ticketStats, refetch: refetchStats } = useQuery({
    queryKey: ["event-ticket-stats", selectedEvent],
    queryFn: async () => {
      const [totalResult, checkedInResult, pendingResult] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", selectedEvent),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", selectedEvent).eq("status", "used"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", selectedEvent).eq("status", "issued"),
      ]);

      const error = totalResult.error || checkedInResult.error || pendingResult.error;
      if (error) throw error;

      return {
        total: totalResult.count || 0,
        checkedIn: checkedInResult.count || 0,
        pending: pendingResult.count || 0,
      };
    },
    enabled: !!selectedEvent,
  });

  const checkInMutation = useMutation({
    mutationFn: async (ticketCode: string) => {
      const { data, error } = await supabase.rpc("check_in_ticket", {
        p_ticket_code: ticketCode.trim(),
        p_event_id: selectedEvent,
      });

      if (error) throw new Error(getCheckInErrorMessage(error));
      return data as any;
    },
    onSuccess: (ticket) => {
      setCheckInResult({ success: true, message: "Check-in realizado com sucesso!", ticket });
      queryClient.setQueryData(["event-tickets", selectedEvent], (current: any[] | undefined) => {
        if (!current) return current;
        return current.map((item) =>
          item.id === ticket.id
            ? {
                ...item,
                ...ticket,
                ticket_types: ticket.ticket_types || item.ticket_types,
                profiles: ticket.profiles || item.profiles,
              }
            : item
        );
      });
      refetchTickets();
      triggerFeedback({ sound: "success", haptic: "success" });
      toast({ title: "✅ Check-in realizado!", description: ticket.ticket_types?.name });
      // Fire confetti 🎉
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"],
      });
      setTimeout(() => setCheckInResult(null), 5000);
    },
    onError: (error: any) => {
      setCheckInResult({ success: false, message: error.message });
      triggerFeedback({ sound: "tap", haptic: "error" });
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setTimeout(() => setCheckInResult(null), 4000);
    },
  });

  const processCode = useCallback((code: string) => {
    const ticketCode = code.trim();
    if (!ticketCode || !selectedEvent || checkInMutation.isPending) return;
    checkInMutation.mutate(ticketCode);
  }, [checkInMutation, selectedEvent]);

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    processCode(manualCode);
    setManualCode("");
  };

  // Realtime subscription for ticket updates
  useEffect(() => {
    if (!selectedEvent) return;

    const channel = supabase
      .channel(`checkin-tickets-${selectedEvent}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${selectedEvent}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["event-tickets", selectedEvent] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEvent, queryClient]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return eventTickets;
    const q = searchQuery.toLowerCase();
    return eventTickets.filter((t: any) => {
      const name = (t.profiles?.full_name || "").toLowerCase();
      const email = (t.profiles?.email || "").toLowerCase();
      const id = t.id.toLowerCase();
      const typeName = (t.ticket_types?.name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q) || typeName.includes(q);
    });
  }, [eventTickets, searchQuery]);

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

          <CheckInFeedback result={checkInResult} />

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
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventTickets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum ingresso vendido para este evento
                  </p>
                ) : filteredTickets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum resultado para "{searchQuery}"
                  </p>
                ) : (
                  filteredTickets.map((ticket: any) => (
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
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge variant="secondary" className="text-xs">Validado</Badge>
                            {ticket.used_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(ticket.used_at), "HH:mm", { locale: ptBR })}
                              </span>
                            )}
                          </div>
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
          {/* Check-in Report */}
          <CheckInReport
            eventId={selectedEvent}
            eventTitle={events.find(e => e.id === selectedEvent)?.title || ""}
            organizerId={organizer.id}
          />
          {/* Collaborator Manager */}
          <CollaboratorManager
            organizerId={organizer.id}
            events={events.map((e) => ({ id: e.id, title: e.title }))}
            selectedEventId={selectedEvent}
          />
        </>
      )}
    </div>
  );
}
