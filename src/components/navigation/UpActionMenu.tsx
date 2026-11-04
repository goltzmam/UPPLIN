import { getPublicAppOrigin } from "@/lib/public-origin";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { MomentComposer } from "@/components/profile/MomentComposer";

export function UpActionMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);
  const handleShareApp = async () => {
    const isEventPage = location.pathname.startsWith("/evento/");
    const currentUrl = window.location.href;

    const shareData = isEventPage
      ? {
          title: "Confira este evento no UP!",
          text: "Vem comigo nesse rolê! 🎉",
          url: currentUrl,
        }
      : {
          title: "UP - Descubra eventos incríveis",
          text: "Vem descobrir os melhores rolês perto de você! 🎉",
          url: getPublicAppOrigin(),
        };

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copiado!");
      } catch {
        // Fallback for insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = shareData.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success("Link copiado!");
      }
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: unknown) {
        // User cancelled or share failed — fallback to copy
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };


  return <>
    <AnimatePresence>{isOpen && <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/70" onClick={onClose} />
      <motion.div role="dialog" aria-label="Ações UPPLIN" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.18 }} className="fixed inset-x-0 bottom-0 z-[1110] space-y-4 rounded-t-3xl border-t border-border bg-background p-5 pb-[max(24px,var(--safe-bottom))]">
        <div className="flex items-center justify-between"><h2 className="font-semibold">O que você quer fazer?</h2><button type="button" aria-label="Fechar ações" className="flex h-11 w-11 items-center justify-center" onClick={onClose}><X /></button></div>
        <button type="button" className="flex min-h-16 w-full items-center gap-4 rounded-2xl bg-muted/40 p-4 text-left" onClick={() => { onClose(); if (user) setCreating(true); else navigate("/login"); }}><Camera className="h-6 w-6 text-primary" /><span><strong className="block">Compartilhar momento</strong><span className="text-sm text-muted-foreground">Câmera, fotos, vídeos ou texto</span></span></button>
        <button type="button" className="flex min-h-16 w-full items-center gap-4 rounded-2xl bg-muted/40 p-4 text-left" onClick={() => { onClose(); void handleShareApp(); }}><Users className="h-6 w-6 text-primary" /><span>Convidar amigos</span></button>
      </motion.div>
    </>}</AnimatePresence>
    <MomentComposer open={creating} onOpenChange={setCreating} onPublished={() => navigate("/perfil?tab=posts")} />
  </>;
}
