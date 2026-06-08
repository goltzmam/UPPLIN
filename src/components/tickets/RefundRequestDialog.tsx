import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    created_at: string;
    total_cents: number;
    events?: { title?: string; start_at?: string };
  };
  onSuccess?: () => void;
}

export function RefundRequestDialog({ open, onOpenChange, order, onSuccess }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const daysSincePurchase = differenceInDays(new Date(), new Date(order.created_at));
  const eventInFuture = order.events?.start_at ? new Date(order.events.start_at) > new Date() : false;
  const withinGuarantee = daysSincePurchase <= 7 && eventInFuture;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const filtered = list.filter((f) => f.size <= 5 * 1024 * 1024).slice(0, 3 - files.length);
    setFiles((prev) => [...prev, ...filtered].slice(0, 3));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 20) {
      toast({ title: "Motivo muito curto", description: "Descreva com pelo menos 20 caracteres.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      // Upload attachments
      const uploaded: string[] = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const path = `${user.id}/${order.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("refund-attachments")
            .upload(path, file, { upsert: false });
          if (upErr) throw upErr;
          uploaded.push(path);
        }
        setUploading(false);
      }

      const { data, error } = await (supabase as any).rpc("request_refund", {
        p_order_id: order.id,
        p_reason: reason.trim(),
        p_attachments: uploaded as any,
      });

      if (error) throw error;

      // Fire-and-forget email + admin notification
      const requestId = (data as any)?.id;
      if (requestId) {
        supabase.functions.invoke("notify-refund", {
          body: { request_id: requestId, event: (data as any)?.within_guarantee ? "requested" : "disputed" },
        }).catch(() => {});
      }

      toast({
        title: "Solicitação enviada",
        description: (data as any)?.within_guarantee
          ? "O organizador tem 48h para responder."
          : "Sua solicitação está fora da garantia e será analisada pela equipe UPPLIN.",
      });
      onSuccess?.();
      onOpenChange(false);
      setReason("");
      setFiles([]);
    } catch (e: any) {
      const msg = e?.message || "";
      let friendly = "Não foi possível enviar sua solicitação.";
      if (/refund_already_requested/.test(msg)) friendly = "Já existe uma solicitação para este pedido.";
      else if (/reason_too_short/.test(msg)) friendly = "Motivo muito curto.";
      else if (/order_not_paid/.test(msg)) friendly = "Este pedido não está pago.";
      toast({ title: "Erro", description: friendly, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar reembolso</DialogTitle>
          <DialogDescription>{order.events?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {withinGuarantee ? (
            <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-xs">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-success">Dentro da garantia (7 dias)</p>
                <p className="text-muted-foreground mt-1">
                  O organizador tem 48h para aprovar. Caso recuse ou não responda, a equipe UPPLIN analisará.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Fora da garantia</p>
                <p className="text-muted-foreground mt-1">
                  Sua solicitação será analisada manualmente pela equipe UPPLIN.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Motivo (mín. 20 caracteres)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do pedido de reembolso..."
              className="mt-1 min-h-[100px]"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/1000</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Anexos (opcional, máx. 3 arquivos de 5MB)</label>
            <div className="mt-1 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                  <span className="flex-1 truncate">{f.name}</span>
                  <Badge variant="outline" className="text-[10px]">{(f.size / 1024).toFixed(0)} KB</Badge>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 3 && (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-3 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30">
                  <Upload className="h-3.5 w-3.5" />
                  Adicionar arquivo
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting || reason.trim().length < 20}>
              {uploading ? "Enviando arquivos..." : submitting ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
