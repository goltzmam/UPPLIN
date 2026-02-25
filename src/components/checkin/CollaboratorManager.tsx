import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Users, Copy, CheckCircle, XCircle, BarChart3, Link2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CollaboratorManagerProps {
  organizerId: string;
  events: Array<{ id: string; title: string }>;
  selectedEventId?: string;
}

export function CollaboratorManager({ organizerId, events, selectedEventId }: CollaboratorManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [eventScope, setEventScope] = useState<string>(selectedEventId || "all");

  // Fetch collaborators
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["checkin-collaborators", organizerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_collaborators")
        .select("*")
        .eq("organizer_id", organizerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch check-in stats per collaborator for selected event
  const { data: collabStats = [] } = useQuery({
    queryKey: ["collab-checkin-stats", organizerId, selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("checked_in_by")
        .eq("event_id", selectedEventId)
        .eq("status", "used")
        .not("checked_in_by", "is", null);
      if (error) throw error;
      // Count per collaborator
      const counts: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        counts[t.checked_in_by] = (counts[t.checked_in_by] || 0) + 1;
      });
      return Object.entries(counts).map(([userId, count]) => ({ userId, count }));
    },
    enabled: !!selectedEventId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("Usuário não encontrado. O colaborador precisa ter uma conta na plataforma.");
      }

      const { error } = await supabase
        .from("checkin_collaborators")
        .insert({
          organizer_id: organizerId,
          user_id: profile.id,
          display_name: name.trim() || profile.full_name || email,
          event_id: eventScope === "all" ? null : eventScope,
          status: "active",
        });

      if (error) {
        if (error.code === "23505") throw new Error("Este colaborador já foi adicionado.");
        throw error;
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-collaborators", organizerId] });
      setEmail("");
      setName("");
      toast({ title: "✅ Colaborador adicionado!", description: "Ele já pode acessar o scanner." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (collabId: string) => {
      const { error } = await supabase
        .from("checkin_collaborators")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", collabId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-collaborators", organizerId] });
      toast({ title: "Colaborador removido" });
    },
  });

  const getStatsForCollab = (userId: string) => {
    return collabStats.find((s) => s.userId === userId)?.count || 0;
  };

  const scannerUrl = selectedEventId
    ? `${window.location.origin}/scan/${selectedEventId}`
    : null;

  const copyLink = () => {
    if (scannerUrl) {
      navigator.clipboard.writeText(scannerUrl);
      toast({ title: "Link copiado!", description: "Compartilhe com seus colaboradores." });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Colaboradores de Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner link */}
        {scannerUrl && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground truncate flex-1">
              {scannerUrl}
            </p>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Add collaborator form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Email do colaborador..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              type="email"
            />
            <Input
              placeholder="Nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-32 sm:w-40"
            />
          </div>
          <div className="flex gap-2">
            <Select value={eventScope} onValueChange={setEventScope}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!email.trim() || addMutation.isPending}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Collaborators list */}
        <AnimatePresence mode="popLayout">
          {collaborators.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum colaborador adicionado ainda
            </p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((collab: any) => (
                <motion.div
                  key={collab.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-3 rounded-xl border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-accent/20 text-accent-foreground text-xs font-bold">
                        {(collab.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{collab.display_name || "Colaborador"}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {collab.event_id
                            ? events.find((e) => e.id === collab.event_id)?.title || "Evento específico"
                            : "Todos os eventos"
                          }
                        </Badge>
                        {selectedEventId && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {getStatsForCollab(collab.user_id)} check-ins
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {collab.display_name} não poderá mais fazer check-in nos seus eventos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMutation.mutate(collab.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
