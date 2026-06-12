import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle, XCircle, Clock, ShieldAlert } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  requested: { label: "Pendente", variant: "default" },
  approved: { label: "Aprovado", variant: "secondary" },
  rejected: { label: "Recusado", variant: "destructive" },
  disputed: { label: "Disputa", variant: "outline" },
  pending_refund: { label: "Processando estorno", variant: "outline" },
  refunded: { label: "Estornado", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
};

export default function AdminRefunds() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [actionDialog, setActionDialog] = useState<{ refund: any; action: "force" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("refund_requests")
        .select("*, events(title), organizer_accounts!organizer_id(display_name)")
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

  const filtered = refunds.filter((r) => (tab === "all" ? true : r.status === tab));

  const handleForce = async () => {
    if (!actionDialog) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc("admin_force_refund", {
        p_request_id: actionDialog.refund.id,
        p_note: note || "Forçado pelo admin",
      });
      if (error) throw error;

      const { error: fnErr } = await supabase.functions.invoke("mp-refund", {
        body: { request_id: actionDialog.refund.id },
      });
      if (fnErr) throw fnErr;

      toast({ title: "Estorno forçado", description: "Reembolso processado via Mercado Pago." });
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      setActionDialog(null);
      setNote("");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionDialog || note.trim().length < 5) {
      toast({ title: "Justificativa obrigatória", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc("admin_reject_refund", {
        p_request_id: actionDialog.refund.id,
        p_note: note.trim(),
      });
      if (error) throw error;
      toast({ title: "Solicitação negada" });
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      setActionDialog(null);
      setNote("");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    disputed: refunds.filter((r) => r.status === "disputed").length,
    requested: refunds.filter((r) => r.status === "requested").length,
    failed: refunds.filter((r) => r.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reembolsos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie disputas e force estornos quando necessário.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="disputed">
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            Disputas ({counts.disputed})
          </TabsTrigger>
          <TabsTrigger value="requested">Pendentes ({counts.requested})</TabsTrigger>
          <TabsTrigger value="failed">Falhas ({counts.failed})</TabsTrigger>
          <TabsTrigger value="pending_refund">Processando</TabsTrigger>
          <TabsTrigger value="refunded">Estornados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum reembolso.</p>
          ) : (
            filtered.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_LABEL[r.status]?.variant}>{STATUS_LABEL[r.status]?.label}</Badge>
                  {r.within_guarantee && <Badge variant="outline" className="text-xs">Dentro da garantia</Badge>}
                  {r.forced_by_admin && <Badge className="text-xs">Forçado</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold">{r.events?.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Organizador: {r.organizer_accounts?.display_name} · Comprador:{" "}
                    {r.profiles?.full_name || r.profiles?.email} · R${" "}
                    {(r.refund_amount_cents / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                  <p className="whitespace-pre-wrap">{r.reason}</p>
                </div>

                {r.decision_note && (
                  <p className="text-xs text-muted-foreground italic">Nota: {r.decision_note}</p>
                )}

                {!["refunded", "rejected"].includes(r.status) && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setActionDialog({ refund: r, action: "force" });
                        setNote("");
                      }}
                    >
                      Forçar estorno
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setActionDialog({ refund: r, action: "reject" });
                        setNote("");
                      }}
                    >
                      Negar definitivamente
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "force" ? "Forçar estorno" : "Negar reembolso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                actionDialog?.action === "force"
                  ? "Nota interna (opcional)"
                  : "Justifique a negativa (mín. 5 caracteres)..."
              }
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setActionDialog(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                variant={actionDialog?.action === "force" ? "default" : "destructive"}
                onClick={actionDialog?.action === "force" ? handleForce : handleReject}
                disabled={loading}
              >
                {loading ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
