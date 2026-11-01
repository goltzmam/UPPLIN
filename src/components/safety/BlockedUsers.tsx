import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBlockedUsers, useSafetyRefresh } from "@/lib/ugc-safety";
export function BlockedUsers() {
  const { data = [], isLoading, isError, refetch } = useBlockedUsers();const refresh = useSafetyRefresh();const [pending, setPending] = useState<string | null>(null);
  const unblock = async (id: string) => { setPending(id);try {const { error } = await supabase.rpc("set_user_block",{p_user_id:id,p_blocked:false});if(error)throw error;await refresh();toast.success("Usuário desbloqueado.");}catch{toast.error("Não foi possível desbloquear.");}finally{setPending(null);} };
  return <section className="rounded-xl border border-border p-4 space-y-3"><h3 className="font-semibold">Usuários bloqueados</h3><p className="text-sm text-muted-foreground">Gerencie os perfis que você bloqueou. Fotos, vídeos, capas e logos passam por revisão antes de aparecerem publicamente. Denúncias podem ser feitas no menu de segurança de publicações, comentários e perfis.</p>{isLoading ? <p>Carregando…</p> : isError ? <Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button> : data.length ? data.map(item => <div key={item.user_id} className="flex items-center justify-between gap-3"><p className="text-sm break-words min-w-0">{item.display_name}</p><Button size="sm" variant="outline" disabled={!!pending} onClick={() => void unblock(item.user_id)}>Desbloquear</Button></div>) : <p className="text-sm text-muted-foreground">Nenhum usuário bloqueado.</p>}</section>;
}
