import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, CheckCircle, XCircle, Camera, Search, Ticket, User, Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: any;
}

export default function CheckIn() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Get organizer account
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["organizer-account", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get organizer events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
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

  // Get tickets for selected event
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

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      // Find ticket
      const { data: ticket, error: findError } = await supabase
        .from("tickets")
        .select(`*, ticket_types(name), events(title, organizer_id)`)
        .eq("id", ticketId)
        .maybeSingle();

      if (findError || !ticket) {
        throw new Error("Ingresso não encontrado");
      }

      // Verify organizer owns this event
      if (ticket.events?.organizer_id !== organizer?.id) {
        throw new Error("Você não tem permissão para validar este ingresso");
      }

      if (ticket.status === "used") {
        throw new Error("Este ingresso já foi utilizado");
      }

      if (ticket.status === "cancelled") {
        throw new Error("Este ingresso foi cancelado");
      }

      // Update ticket
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      return ticket;
    },
    onSuccess: (ticket) => {
      setCheckInResult({
        success: true,
        message: "Check-in realizado com sucesso!",
        ticket,
      });
      refetchTickets();
      toast({ title: "✅ Check-in realizado!", description: ticket.ticket_types?.name });
    },
    onError: (error: any) => {
      setCheckInResult({
        success: false,
        message: error.message,
      });
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    
    // Try to parse QR code JSON or use as ticket ID
    let ticketId = manualCode.trim();
    try {
      const parsed = JSON.parse(manualCode);
      ticketId = parsed.ticketId || parsed.id || manualCode;
    } catch {
      // Not JSON, use as-is
    }
    
    checkInMutation.mutate(ticketId);
    setManualCode("");
  };

  const handleTicketCheckIn = (ticketId: string) => {
    checkInMutation.mutate(ticketId);
  };

  if (authLoading || orgLoading) return <><Header /><PageLoading /><Footer /></>;

  if (!organizer) {
    navigate("/organizador");
    return null;
  }

  const checkedIn = eventTickets.filter(t => t.status === "used").length;
  const total = eventTickets.length;
  const pending = eventTickets.filter(t => t.status === "issued").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="container px-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/organizador")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Check-in</h1>
              <p className="text-sm text-muted-foreground">Valide os ingressos na entrada do evento</p>
            </div>
          </div>

          {/* Event Selector */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Selecionar Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.start_at), "dd/MM/yyyy", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedEvent && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-success">{checkedIn}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Validados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-warning">{pending}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold">{total}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Manual Check-in */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Validar Ingresso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código do ingresso ou escaneie o QR Code"
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

                  {/* Check-in Result */}
                  <AnimatePresence>
                    {checkInResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "mt-4 p-4 rounded-xl flex items-center gap-3",
                          checkInResult.success
                            ? "bg-success/10 border border-success/30"
                            : "bg-destructive/10 border border-destructive/30"
                        )}
                      >
                        {checkInResult.success ? (
                          <CheckCircle className="h-8 w-8 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-8 w-8 text-destructive shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold">{checkInResult.message}</p>
                          {checkInResult.ticket && (
                            <p className="text-sm text-muted-foreground">
                              {checkInResult.ticket.ticket_types?.name}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => setCheckInResult(null)}
                        >
                          Fechar
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Tickets List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Lista de Ingressos
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
                            "flex items-center justify-between p-3 rounded-lg border",
                            ticket.status === "used" && "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                              ticket.status === "used" ? "bg-success/10" : "bg-primary/10"
                            )}>
                              {ticket.status === "used" ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : (
                                <User className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {ticket.profiles?.full_name || "Sem nome"}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {ticket.ticket_types?.name} • #{ticket.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={ticket.status === "used" ? "secondary" : "default"}>
                              {ticket.status === "used" ? "Validado" : "Pendente"}
                            </Badge>
                            {ticket.status === "issued" && (
                              <Button
                                size="sm"
                                onClick={() => handleTicketCheckIn(ticket.id)}
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
      </main>

      <Footer />
    </div>
  );
}
