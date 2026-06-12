import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Copy, RefreshCw } from "lucide-react";

type Role = "admin" | "marketing" | "support";

export default function AdminEquipe() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(["marketing"]);

  const invites = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const collaborators = useQuery({
    queryKey: ["admin-collaborators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "marketing", "support"]);
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((r) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, photo_url, last_seen_at")
        .in("id", ids);
      const byUser = new Map<string, { roles: Role[]; profile: any }>();
      for (const row of data || []) {
        const existing = byUser.get(row.user_id) || { roles: [], profile: null };
        existing.roles.push(row.role as Role);
        byUser.set(row.user_id, existing);
      }
      for (const p of profs || []) {
        const entry = byUser.get(p.id);
        if (entry) entry.profile = p;
      }
      return Array.from(byUser.entries()).map(([user_id, v]) => ({ user_id, ...v }));
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      if (!email || !selectedRoles.length) throw new Error("Preencha email e selecione ao menos um papel");
      const { data, error } = await supabase.functions.invoke("admin-invite-create", {
        body: { email: email.trim().toLowerCase(), roles: selectedRoles },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Convite enviado", description: "Email enviado com o link de aceite." });
      setOpen(false);
      setEmail("");
      setSelectedRoles(["marketing"]);
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invites"] }),
  });

  const removeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: Role }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collaborators"] }),
  });

  const toggleRole = (role: Role) =>
    setSelectedRoles((s) => (s.includes(role) ? s.filter((r) => r !== role) : [...s, role]));

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/admin/aceitar-convite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Convide colaboradores para marketing e suporte.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Convidar colaborador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo convite</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colaborador@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Papéis</Label>
                {(["marketing", "support", "admin"] as Role[]).map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedRoles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                    <span className="capitalize">{r === "admin" ? "Admin (acesso total)" : r === "marketing" ? "Marketing (campanhas)" : "Suporte (chat)"}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
                {createInvite.isPending ? "Enviando..." : "Enviar convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Colaboradores ativos</h2>
        {collaborators.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !collaborators.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador ainda.</p>
        ) : (
          <div className="space-y-2">
            {collaborators.data.map((c) => (
              <div key={c.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{c.profile?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.profile?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1">
                      {r}
                      <button onClick={() => removeRole.mutate({ user_id: c.user_id, role: r })}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Convites</h2>
        {invites.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !invites.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum convite.</p>
        ) : (
          <div className="space-y-2">
            {invites.data.map((i) => {
              const expired = new Date(i.expires_at) < new Date();
              const accepted = !!i.accepted_at;
              return (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{i.email}</span>
                      {accepted ? (
                        <Badge variant="default">aceito</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">expirado</Badge>
                      ) : (
                        <Badge variant="secondary">pendente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Papéis: {(i.roles as string[]).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!accepted && (
                      <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => revokeInvite.mutate(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
