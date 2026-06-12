import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganizerContext } from "@/components/organizador/OrganizerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: any; icon: any }> = {
  requested: { label: "Pendente", variant: "default", icon: Clock },
  approved: { label: "Aprovado", variant: "secondary", icon: CheckCircle },
  rejected: { label: "Recusado", variant: "destructive", icon: XCircle },
  disputed: { label: "Em disputa (admin)", variant: "outline", icon: AlertCircle },
  pending_refund: { label: "Processando estorno", variant: "outline", icon: RefreshCw },
  refunded: { label: "Estornado", variant: "secondary", icon: CheckCircle },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
};

export default function ReembolsosContent() {
  const { organizer } = useOrganizerContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("requested");
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["organizer-refunds", organizer.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("refund_requests")
        .select("*, orders(total_cents, buyer_user_id), events(title)")
        .eq("organizer_id", organizer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const requesterIds = [...new Set(rows.map((r: any) => r.requester_user_id).filter(Boolean))];
      const { data: profiles } = requesterIds.length
        ? await (supabase as any).from("profiles").select("id, full_name, email").in("id", requesterIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return rows.map((r: any) => ({ ...r, profiles: profileMap.get(r.requester_user_id) || null }));
    },
  });

  const handleApprove = async (refund: any) => {
    if (!confirm("Aprovar reembolso e processar estorno via Mercado Pago?")) return;
    setActionLoading(refund.id);
    try {
      const { error } = await (supabase as any).rpc("decide_refund", {
        p_request_id: refund.id,
        p_decision: "approve",
      });
      if (error) throw error;

      const { error: fnErr } = await supabase.functions.invoke("mp-refund", {
        body: { request_id: refund.id },
      });
      if (fnErr) throw fnErr;

      toast({ title: "Reembolso aprovado", description: "Estorno processado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["organizer-refunds"] });
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting || rejectNote.trim().length < 5) {
      toast({ title: "Justificativa obrigatória", description: "Mínimo 5 caracteres.", variant: "destructive" });
      return;
    }
    setActionLoading(rejecting.id);
    try {
      const { error } = await (supabase as any).rpc("decide_refund", {
        p_request_id: rejecting.id,
        p_decision: "reject",
        p_note: rejectNote.trim(),
      });
      if (error) throw error;
      toast({ title: "Recusado", description: "Solicitação enviada ao admin para análise." });
      queryClient.invalidateQueries({ queryKey: ["organizer-refunds"] });
      setRejecting(null);
      setRejectNote("");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = refunds.filter((r) =>
    tab === "requested" ? r.status === "requested" : tab === "all" ? true : r.status === tab
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reembolsos</h1>
        <p className="text-sm text-muted-foreground mt-1">Solicitações de reembolso dos seus eventos</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requested">
            Pendentes ({refunds.filter((r) => r.status === "requested").length})
          </TabsTrigger>
          <TabsTrigger value="pending_refund">Processando</TabsTrigger>
          <TabsTrigger value="refunded">Estornados</TabsTrigger>
          <TabsTrigger value="disputed">Em disputa</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma solicitação aqui.</p>
          ) : (
            filtered.map((r: any) => {
              const StatusIcon = STATUS_LABEL[r.status]?.icon || Clock;
              return (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_LABEL[r.status]?.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_LABEL[r.status]?.label}
                        </Badge>
                        {r.within_guarantee && (
                          <Badge variant="outline" className="text-xs">Dentro da garantia</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="font-semibold mt-2">{r.events?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {r.profiles?.full_name || r.profiles?.email} · R${" "}
                        {(r.refund_amount_cents / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-lg p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                    <p className="whitespace-pre-wrap">{r.reason}</p>
                  </div>

                  {r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.attachments.map((path: string, i: number) => (
                        <AttachmentLink key={i} path={path} index={i} />
                      ))}
                    </div>
                  )}

                  {r.decision_note && (
                    <p className="text-xs text-muted-foreground italic">Sua nota: {r.decision_note}</p>
                  )}

                  {r.status === "requested" && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(r)}
                        disabled={actionLoading === r.id}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {actionLoading === r.id ? "Processando..." : "Aprovar e estornar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setRejecting(r)}
                        disabled={actionLoading === r.id}
                      >
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejecting} onOpenChange={() => setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar reembolso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A solicitação será enviada para a equipe UPPLIN analisar.
            </p>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Justifique a recusa (mín. 5 caracteres)..."
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejecting(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={!!actionLoading}>
                Confirmar recusa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentLink({ path, index }: { path: string; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.storage
      .from("refund-attachments")
      .createSignedUrl(path, 300);
    if (data?.signedUrl) {
      setUrl(data.signedUrl);
      window.open(data.signedUrl, "_blank");
    }
  };
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>
      📎 Anexo {index + 1}
    </Button>
  );
}
