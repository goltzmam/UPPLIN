import { SafetyActions } from "@/components/safety/SafetyActions";
import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type ChatIdentity } from "@/lib/chat";
import { APP_ORIGIN } from "@/lib/web-surfaces";
export function ChatProfileDialog({ identity, onClose }: { identity: ChatIdentity | null; onClose: () => void }) {
  const lastIdentity = useRef(identity);
  if (identity) lastIdentity.current = identity;
  const visible = identity || lastIdentity.current;
  return <Dialog open={!!identity} onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>Perfil {visible?.is_support ? "do suporte" : visible?.is_organizer ? "do organizador" : "do participante"}</DialogTitle></DialogHeader>
    {visible && <div className="space-y-4 text-center">
      {visible.cover_photo_url && <img src={visible.cover_photo_url} alt="Capa do perfil" className="h-28 w-full rounded-lg object-cover" />}
      <Avatar className="mx-auto h-24 w-24"><AvatarImage src={visible.photo_url || undefined} alt={visible.full_name} /><AvatarFallback>{visible.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <p className="text-xl font-semibold">{visible.full_name}</p>
      <p className="text-sm text-muted-foreground">{visible.is_support ? "Equipe oficial UPPLIN" : visible.is_organizer ? "Organizador" : "Participante"}</p>
      {!visible.is_support && <div className="flex justify-center"><SafetyActions userId={visible.id} onBlocked={onClose} /></div>}
      {visible.profile_path && <a href={APP_ORIGIN + visible.profile_path} target="_blank" rel="noopener noreferrer" className="inline-block text-primary underline">Ver página do organizador</a>}
    </div>}
  </DialogContent></Dialog>;
}
