import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, QrCode, Keyboard, Search, ArrowLeft, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QRScanner } from "@/components/checkin/QRScanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/feedback";
import { getCheckInErrorMessage } from "@/lib/checkin";
import confetti from "canvas-confetti";

interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: any;
}

export default function CollaboratorScanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualCode, setManualCode] = useState("");
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

  // Verify access
  const { data: access, isLoading: accessLoading, error: accessError } = useQuery({
    queryKey: ["collab-access", eventId, user?.id],
    queryFn: async () => {
      // Check if user is a collaborator for this event
      const { data, error } = await supabase
        .from("checkin_collaborators")
        .select("*, organizer_accounts:organizer_id(display_name)")
        .eq("user_id", user!.id)
        .eq("status", "active");

      if (error) throw error;

      // Find a matching collaborator entry (specific event or all events for this organizer)
      const match = (data || []).find((c: any) => {
        if (c.event_id === eventId) return true;
        if (c.event_id === null) {
          // Check if this organizer owns this event
          return true; // We'll verify in the next query
        }
        return false;
      });

      if (!match) throw new Error("Sem acesso");

      // Also check if user is the organizer owner
      const { data: event } = await supabase
        .from("events")
        .select("id, title, organizer_id, venue_name, start_at")
        .eq("id", eventId!)
        .maybeSingle();

      if (!event) throw new Error("Evento não encontrado");

      // Verify the collaborator's organizer matches the event's organizer
      const validCollab = (data || []).find((c: any) =>
        c.organizer_id === event.organizer_id && (c.event_id === null || c.event_id === eventId)
      );

      if (!validCollab) throw new Error("Sem acesso a este evento");

      return { collaborator: validCollab, event };
    },
    enabled: !!user && !!eventId,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["collab-scanner-stats", eventId, user?.id],
    queryFn: async () => {
      const { data: allTickets } = await supabase
        .from("tickets")
        .select("status, checked_in_by")
        .eq("event_id", eventId!);

      const total = allTickets?.length || 0;
      const checkedIn = allTickets?.filter((t) => t.status === "used").length || 0;
      const myCheckins = allTickets?.filter((t) => t.checked_in_by === user!.id).length || 0;

      return { total, checkedIn, myCheckins };
    },
    enabled: !!access && !!user,
  });

  // Realtime
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`collab-scan-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["collab-scanner-stats", eventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  const checkInMutation = useMutation({
    mutationFn: async (ticketCode: string) => {
      const { data, error } = await supabase.rpc("check_in_ticket", {
        p_ticket_code: ticketCode.trim(),
        p_event_id: eventId!,
      });

      if (error) throw new Error(getCheckInErrorMessage(error));
      return data as any;
    },
    onSuccess: (ticket) => {
      setCheckInResult({ success: true, message: "Check-in realizado!", ticket });
      triggerFeedback({ sound: "success", haptic: "success" });
      queryClient.invalidateQueries({ queryKey: ["collab-scanner-stats", eventId] });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#f59e0b", "#8b5cf6", "#ec4899", "#10b981"] });
      setTimeout(() => setCheckInResult(null), 5000);
    },
    onError: (error: any) => {
      setCheckInResult({ success: false, message: error.message });
      triggerFeedback({ sound: "tap", haptic: "error" });
      setTimeout(() => setCheckInResult(null), 4000);
    },
  });

  const processCode = useCallback((code: string) => {
    const ticketCode = code.trim();
    if (!ticketCode) return;
    checkInMutation.mutate(ticketCode);
  }, [checkInMutation]);

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    processCode(manualCode);
    setManualCode("");
  };

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-4">
            <QrCode className="h-12 w-12 text-primary mx-auto" />
            <h2 className="font-display font-bold text-lg">Scanner de Check-in</h2>
            <p className="text-sm text-muted-foreground">Faça login para acessar o scanner de check-in.</p>
            <Button onClick={() => navigate("/login")} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="font-display font-bold text-lg">Acesso negado</h2>
            <p className="text-sm text-muted-foreground">Você não tem permissão para fazer check-in neste evento.</p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-sm truncate">{access?.event.title}</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {access?.event.venue_name} · Scanner: {access?.collaborator.display_name}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <Wifi className="h-3 w-3" />
            Live
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">{stats?.myCheckins || 0}</p>
            <p className="text-[10px] text-muted-foreground">Meus</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats?.checkedIn || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-muted-foreground">{stats?.total || 0}</p>
            <p className="text-[10px] text-muted-foreground">Ingressos</p>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {checkInResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3 border-2",
                checkInResult.success
                  ? "bg-green-50 dark:bg-green-950/30 border-green-500/40"
                  : "bg-red-50 dark:bg-red-950/30 border-destructive/40"
              )}
            >
              {checkInResult.success ? (
                <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold">{checkInResult.success ? "Entrada liberada!" : "Não autorizado"}</p>
                <p className="text-xs text-muted-foreground">{checkInResult.message}</p>
                {checkInResult.success && checkInResult.ticket?.profiles && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8 border border-primary/30">
                      <AvatarImage src={checkInResult.ticket.profiles.photo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(checkInResult.ticket.profiles.full_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{checkInResult.ticket.profiles.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{checkInResult.ticket.ticket_types?.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner tabs */}
        <Tabs defaultValue="scanner" className="space-y-3">
          <TabsList className="w-full">
            <TabsTrigger value="scanner" className="flex-1 gap-1.5">
              <QrCode className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-1.5">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner">
            <Card>
              <CardContent className="p-4">
                <QRScanner onScan={processCode} isProcessing={checkInMutation.isPending} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Digite o código do ingresso</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Código do ingresso..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualCheckIn()}
                    className="flex-1"
                  />
                  <Button onClick={handleManualCheckIn} disabled={!manualCode.trim() || checkInMutation.isPending}>
                    <Search className="h-4 w-4 mr-1" />
                    Validar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
