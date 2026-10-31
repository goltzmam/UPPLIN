import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, ShieldCheck, Clock, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { loadModerationQueue, safeMediaUrl, REPORT_REASONS, type ReportKind } from "@/lib/ugc-safety";
import { supabase } from "@/integrations/supabase/client";
export default function AdminModeration() {
  const client = useQueryClient();const [busy, setBusy] = useState<string | null>(null);const [notes, setNotes] = useState<Record<string,string>>({});
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["moderation-queue"], queryFn: loadModerationQueue, refetchInterval: 15000 });
  const review = async (kind: ReportKind | "organizer", id: string, action: string, reportId?: string) => {
    setBusy(reportId || id);
    try { const { error } = await supabase.rpc("review_ugc",{p_kind:kind,p_id:id,p_action:action,...(reportId ? {p_report_id:reportId,p_note:notes[reportId] || ""} : {})});if(error)throw error;
      await client.invalidateQueries();toast.success("Revisão registrada.");
    } catch { toast.error("Não foi possível registrar a revisão."); }finally{setBusy(null);}
  };
  if(isLoading)return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if(isError)return <div role="alert" className="p-8 space-y-3"><p>Não foi possível carregar a moderação.</p><Button onClick={() => void refetch()}>Tentar novamente</Button></div>;
  const reports=data?.reports || [];const pending=data?.pending || [];const open=reports.filter(r=>r.status==='open'||r.status==='reviewing');
  return <div className="p-4 md:p-8 space-y-7 max-w-6xl mx-auto">
    <div><h1 className="text-2xl font-bold">Moderação e denúncias</h1><p className="text-muted-foreground mt-1">Analise o conteúdo e os relatos recebidos pelo suporte UPPLIN.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-4"><Flag className="text-primary h-5 w-5" /><p className="font-bold text-2xl mt-2">{open.length}</p><p className="text-sm text-muted-foreground">Denúncias em aberto</p></div><div className="rounded-xl border p-4"><Image className="text-primary h-5 w-5" /><p className="font-bold text-2xl mt-2">{pending.length}</p><p className="text-sm text-muted-foreground">Conteúdos aguardando revisão</p></div><div className="rounded-xl border p-4"><Clock className="text-primary h-5 w-5" /><p className="font-bold mt-2">Prioridade em até 24h</p><p className="text-sm text-muted-foreground">Fila atualizada a cada 15 segundos.</p></div></div>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Denúncias recebidas</h2>{!reports.length && <p className="text-muted-foreground">Nenhuma denúncia recebida.</p>}
      {reports.map(report => {const active=report.status==='open'||report.status==='reviewing';const late=active&&Date.parse(report.due_at)<Date.now();return <article key={report.id} className="rounded-2xl border p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold min-w-0 break-words">{report.target_name || 'Conta excluída'} · {report.target_kind==='post'?'Publicação':report.target_kind==='comment'?'Comentário':report.target_kind==='review'?'Avaliação':'Perfil'}</h3><Badge variant={late?'destructive':'outline'}>{late?'Prazo de atendimento excedido':({open:'Recebida',reviewing:'Em análise',resolved:'Resolvida',dismissed:'Encerrada'}[report.status] || report.status)}</Badge></div>
        <p className="text-sm">{REPORT_REASONS.find(([id])=>id===report.reason)?.[1] || report.reason} · {new Date(report.created_at).toLocaleString('pt-BR')}</p>
        {report.details && <p className="text-sm whitespace-pre-wrap break-words">{report.details}</p>}
        <blockquote className="rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap break-words">{report.evidence.content || report.evidence.name || 'Dados pessoais removidos ou conteúdo indisponível.'}</blockquote>
        {(report.evidence.media_url || report.evidence.photo_url) && <a className="text-primary underline text-sm" href={safeMediaUrl(report.evidence.media_url || report.evidence.photo_url)} target="_blank" rel="noreferrer">Abrir mídia denunciada</a>}
        {active && <><Textarea aria-label="Nota do suporte" maxLength={1000} placeholder="Registre a análise e a medida tomada (visível apenas ao suporte)." value={notes[report.id] || ''} onChange={e=>setNotes({...notes,[report.id]:e.target.value})} /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void review(report.target_kind,report.target_id,'reviewing',report.id)}>Iniciar análise</Button><Button size="sm" variant="destructive" disabled={!!busy} onClick={()=>void review(report.target_kind,report.target_id,'hide',report.id)}>Ocultar conteúdo e resolver</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void review(report.target_kind,report.target_id,'dismiss',report.id)}>Encerrar sem remoção</Button></div></>}
        {!active && report.resolution_note && <p className="text-sm text-muted-foreground">{report.resolution_note}</p>}
      </article>;})}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Revisão antes da publicação</h2><p className="text-sm text-muted-foreground">Confira todas as mídias e o texto antes de aprovar. Conteúdo pendente aparece apenas ao autor e ao suporte.</p>{!pending.length && <p className="text-muted-foreground">Nenhum conteúdo aguardando revisão.</p>}
      {pending.map(item=><article key={item.kind+item.id} className="rounded-2xl border p-4 space-y-3"><div className="flex justify-between gap-3"><h3 className="font-semibold">{item.label}</h3><Badge variant="outline">Em análise</Badge></div><p className="whitespace-pre-wrap break-words text-sm">{item.content || 'Publicação com mídia'}</p>{item.media_url && <a href={safeMediaUrl(item.media_url)} className="block underline text-primary" target="_blank" rel="noreferrer">Abrir imagem ou vídeo</a>}{item.cover_url && <a href={safeMediaUrl(item.cover_url)} className="block underline text-primary" target="_blank" rel="noreferrer">Abrir capa do perfil</a>}<div className="flex gap-2 flex-wrap"><Button size="sm" disabled={!!busy || (!!item.media_url && !safeMediaUrl(item.media_url)) || (!!item.cover_url && !safeMediaUrl(item.cover_url))} onClick={()=>void review(item.kind,item.id,'approve')}><ShieldCheck className="h-4 w-4 mr-2" />Aprovar publicação</Button><Button size="sm" variant="destructive" disabled={!!busy} onClick={()=>void review(item.kind,item.id,'hide')}>Ocultar conteúdo</Button></div></article>)}
    </section>
    <Link to="/chats" className="text-sm text-primary underline">Abrir Central de Mensagens</Link>
  </div>;
}
