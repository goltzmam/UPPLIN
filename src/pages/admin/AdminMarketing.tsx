import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Eye, Clock, BarChart3, Users, Trash2 } from "lucide-react";

type Audience = { id: string; name: string; description: string | null; filter: any; cached_count: number | null };
type Campaign = {
  id: string; name: string; subject: string; status: string; html_body: string;
  audience_id: string | null; scheduled_at: string | null; sent_at: string | null;
  total_recipients: number; sent_count: number; delivered_count: number;
  opened_count: number; clicked_count: number; bounced_count: number; unsubscribed_count: number;
};

export default function AdminMarketing() {
  const { toast } = useToast();
  const qc = useQueryClient();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Marketing</h1>
        <p className="text-muted-foreground">Crie campanhas, segmente audiência e acompanhe métricas.</p>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns"><Send className="h-4 w-4 mr-2" />Campanhas</TabsTrigger>
          <TabsTrigger value="audiences"><Users className="h-4 w-4 mr-2" />Audiências</TabsTrigger>
          <TabsTrigger value="metrics"><BarChart3 className="h-4 w-4 mr-2" />Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="audiences"><AudiencesTab /></TabsContent>
        <TabsContent value="metrics"><MetricsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AudiencesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", audience: "participants", city: "", inactive_days: "" });

  const list = useQuery({
    queryKey: ["audiences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_audiences").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Audience[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const filter: any = { audience: form.audience };
      if (form.city) filter.city = form.city;
      if (form.inactive_days) filter.inactive_days = parseInt(form.inactive_days);
      const { error } = await supabase.from("email_audiences").insert({
        name: form.name, description: form.description || null, filter,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Audiência criada" });
      setOpen(false);
      setForm({ name: "", description: "", audience: "participants", city: "", inactive_days: "" });
      qc.invalidateQueries({ queryKey: ["audiences"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const preview = useMutation({
    mutationFn: async (filter: any) => {
      const { data, error } = await supabase.rpc("compute_audience", { p_filter: filter });
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count) => toast({ title: `Audiência: ${count} pessoas` }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova audiência</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar audiência</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Público</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participants">Participantes</SelectItem>
                    <SelectItem value="organizers">Organizadores</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cidade (opcional)</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Inativos há X dias (opcional)</Label><Input type="number" value={form.inactive_days} onChange={(e) => setForm({ ...form, inactive_days: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {list.data?.map((a) => (
          <Card key={a.id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{a.name}</h3>
              <p className="text-xs text-muted-foreground">{a.description || JSON.stringify(a.filter)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => preview.mutate(a.filter)}>
              <Eye className="h-4 w-4 mr-2" />Pré-visualizar
            </Button>
          </Card>
        ))}
        {!list.data?.length && <p className="text-sm text-muted-foreground">Nenhuma audiência criada.</p>}
      </div>
    </div>
  );
}

function CampaignsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const list = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const send = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("marketing-send-campaign", { body: { campaign_id: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Envio iniciado" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nova campanha
        </Button>
      </div>

      <div className="grid gap-3">
        {list.data?.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <Badge variant={c.status === "sent" ? "default" : c.status === "sending" ? "secondary" : "outline"}>{c.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.subject}</p>
                {c.status === "sent" && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Enviados: {c.sent_count}/{c.total_recipients}</span>
                    <span>Aberturas: {c.opened_count}</span>
                    <span>Cliques: {c.clicked_count}</span>
                    <span>Bounces: {c.bounced_count}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status === "draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(c); setEditorOpen(true); }}>Editar</Button>
                    <Button size="sm" onClick={() => send.mutate(c.id)}><Send className="h-4 w-4 mr-1" />Enviar</Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {!list.data?.length && <p className="text-sm text-muted-foreground">Nenhuma campanha criada.</p>}
      </div>

      {editorOpen && (
        <CampaignEditor
          campaign={editing}
          onClose={() => { setEditorOpen(false); qc.invalidateQueries({ queryKey: ["campaigns"] }); }}
        />
      )}
    </div>
  );
}

function CampaignEditor({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: campaign?.name || "",
    subject: campaign?.subject || "",
    preheader: "",
    html_body: campaign?.html_body || `<h1>Olá {{first_name}}</h1>\n<p>Sua mensagem aqui.</p>\n<p><a href="https://upplin.com">Acessar UPPLIN</a></p>`,
    audience_id: campaign?.audience_id || "",
  });
  const [testEmail, setTestEmail] = useState("");

  const audiences = useQuery({
    queryKey: ["audiences-select"],
    queryFn: async () => {
      const { data } = await supabase.from("email_audiences").select("id, name");
      return data || [];
    },
  });

  const save = async () => {
    const payload = { ...form, audience_id: form.audience_id || null };
    if (campaign) {
      const { error } = await supabase.from("email_campaigns").update(payload).eq("id", campaign.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("email_campaigns").insert(payload);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    toast({ title: "Salvo" });
    onClose();
  };

  const sendTest = async () => {
    if (!testEmail) return;
    const { error } = await supabase.functions.invoke("marketing-test-send", {
      body: { to: testEmail, subject: form.subject, html: form.html_body },
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Email de teste enviado" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign ? "Editar" : "Nova"} campanha</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div><Label>Nome interno</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Assunto</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Preheader</Label><Input value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} /></div>
            <div>
              <Label>Audiência</Label>
              <Select value={form.audience_id} onValueChange={(v) => setForm({ ...form, audience_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {audiences.data?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>HTML (use {`{{first_name}}`} e {`{{unsubscribe_url}}`})</Label>
              <Textarea rows={12} value={form.html_body} onChange={(e) => setForm({ ...form, html_body: e.target.value })} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Email para teste" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <Button variant="outline" onClick={sendTest}>Teste</Button>
            </div>
          </div>
          <div>
            <Label>Preview</Label>
            <div className="border rounded-lg p-4 bg-white text-black h-[500px] overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: form.html_body.replace(/\{\{first_name\}\}/g, "Maria").replace(/\{\{unsubscribe_url\}\}/g, "#") }} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar rascunho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricsTab() {
  const stats = useQuery({
    queryKey: ["marketing-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_campaigns")
        .select("sent_count, delivered_count, opened_count, clicked_count, bounced_count, unsubscribed_count")
        .eq("status", "sent");
      const totals = (data || []).reduce(
        (acc, r) => ({
          sent: acc.sent + (r.sent_count || 0),
          delivered: acc.delivered + (r.delivered_count || 0),
          opened: acc.opened + (r.opened_count || 0),
          clicked: acc.clicked + (r.clicked_count || 0),
          bounced: acc.bounced + (r.bounced_count || 0),
          unsub: acc.unsub + (r.unsubscribed_count || 0),
        }),
        { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsub: 0 }
      );
      return totals;
    },
  });

  const t = stats.data;
  const rate = (n: number) => (t && t.sent > 0 ? `${((n / t.sent) * 100).toFixed(1)}%` : "—");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card className="p-4"><p className="text-xs text-muted-foreground">Enviados</p><p className="text-2xl font-bold">{t?.sent ?? 0}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Entregues</p><p className="text-2xl font-bold">{t?.delivered ?? 0}</p><p className="text-xs">{rate(t?.delivered ?? 0)}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Aberturas</p><p className="text-2xl font-bold">{t?.opened ?? 0}</p><p className="text-xs">{rate(t?.opened ?? 0)}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Cliques</p><p className="text-2xl font-bold">{t?.clicked ?? 0}</p><p className="text-xs">{rate(t?.clicked ?? 0)}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Bounces</p><p className="text-2xl font-bold">{t?.bounced ?? 0}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Descadastros</p><p className="text-2xl font-bold">{t?.unsub ?? 0}</p></Card>
    </div>
  );
}
