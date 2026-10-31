import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, MoreHorizontal, ShieldBan, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { REPORT_REASONS, type ReportKind, useBlockedUsers, useSafetyRefresh } from "@/lib/ugc-safety";

export function SafetyActions({ userId, kind = "profile", targetId, onBlocked }: { userId: string; kind?: ReportKind; targetId?: string; onBlocked?: () => void }) {
  const { user } = useAuth();const navigate = useNavigate();const refresh = useSafetyRefresh();const { data: blocked = [] } = useBlockedUsers();
  const [reportKind, setReportKind] = useState<ReportKind | null>(null);const [blockDialog, setBlockDialog] = useState(false);
  const [reason, setReason] = useState<string>("harassment");const [details, setDetails] = useState("");const [pending, setPending] = useState(false);
  if (!userId || user?.id === userId) return null;
  const isBlocked = blocked.some(item => item.user_id === userId);
  const requireLogin = (action: () => void) => { if (!user) { toast.info("Entre na sua conta para usar esta opção.");navigate("/login");return; }action(); };
  const report = async () => {
    if (!reportKind || pending) return;setPending(true);
    try {
      const { error } = await supabase.rpc("report_content", { p_kind: reportKind, p_target: reportKind === "profile" ? userId : targetId!, p_reason: reason, p_details: details.trim() });
      if (error) throw error;toast.success("Denúncia recebida pelo suporte UPPLIN.");setReportKind(null);setDetails("");
    } catch { toast.error("Não foi possível enviar a denúncia. Tente novamente ou fale com o suporte."); }
    finally { setPending(false); }
  };
  const block = async () => {
    if (pending) return;setPending(true);
    try { const { error } = await supabase.rpc("set_user_block", { p_user_id: userId, p_blocked: !isBlocked });if (error) throw error;
      setBlockDialog(false);toast.success(isBlocked ? "Usuário desbloqueado." : "Usuário bloqueado.");await refresh();onBlocked?.();
    } catch { toast.error("Não foi possível atualizar o bloqueio."); }finally { setPending(false); }
  };
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label={`Segurança ${kind === "post" ? "da publicação" : kind === "comment" ? "do comentário" : kind === "review" ? "da avaliação" : "do perfil"}`} className="h-9 w-9 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {kind !== "profile" && <DropdownMenuItem onSelect={() => requireLogin(() => setReportKind(kind))}><Flag className="h-4 w-4 mr-2" />Denunciar {kind === "post" ? "publicação" : kind === "review" ? "avaliação" : "comentário"}</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => requireLogin(() => setReportKind("profile"))}><Flag className="h-4 w-4 mr-2" />Denunciar perfil</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => requireLogin(() => setBlockDialog(true))}><ShieldBan className="h-4 w-4 mr-2" />{isBlocked ? "Desbloquear usuário" : "Bloquear usuário"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={!!reportKind} onOpenChange={open => { if (!open && !pending) setReportKind(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Denunciar {reportKind === "post" ? "publicação" : reportKind === "comment" ? "comentário" : reportKind === "review" ? "avaliação" : "perfil"}</DialogTitle><DialogDescription>A equipe de suporte UPPLIN recebe a denúncia para análise. A pessoa denunciada não vê quem enviou.</DialogDescription></DialogHeader>
      <Label htmlFor="report-reason">Motivo</Label><select id="report-reason" className="w-full rounded-xl border bg-background p-3" value={reason} onChange={e => setReason(e.target.value)}>{REPORT_REASONS.map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select>
      <Label htmlFor="report-details">Detalhes (opcional)</Label><Textarea id="report-details" value={details} maxLength={1000} onChange={e => setDetails(e.target.value)} placeholder="Conte ao suporte o que aconteceu. Não inclua senhas ou dados de pagamento." />
      <Button type="button" disabled={pending} onClick={() => void report()}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar denúncia</Button>
    </DialogContent></Dialog>
    <Dialog open={blockDialog} onOpenChange={open => { if (!pending) setBlockDialog(open); }}><DialogContent><DialogHeader><DialogTitle>{isBlocked ? "Desbloquear usuário?" : "Bloquear usuário?"}</DialogTitle><DialogDescription>{isBlocked ? "O conteúdo e as conversas voltam a ficar disponíveis." : "Vocês deixam de ver o conteúdo social um do outro e não podem trocar mensagens. Seus pedidos, ingressos e o acesso ao suporte continuam disponíveis. Você pode desfazer em Configurações → Usuários bloqueados."}</DialogDescription></DialogHeader>
      <div className="flex gap-2 justify-end"><Button variant="outline" type="button" disabled={pending} onClick={() => setBlockDialog(false)}>Cancelar</Button><Button type="button" variant="destructive" disabled={pending} onClick={() => void block()}>{isBlocked ? "Confirmar desbloqueio" : "Confirmar bloqueio"}</Button></div>
    </DialogContent></Dialog>
  </>;
}
