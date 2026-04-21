import { useState } from "react";
import { Share2, Check, MessageCircle, Facebook, Twitter, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ShareButtonProps {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventImage?: string | null;
  className?: string;
  iconOnly?: boolean;
  strokeWidth?: number;
}

/**
 * Copia texto para a área de transferência com fallback robusto
 * para navegadores sem suporte ao Clipboard API (in-app browsers).
 */
async function copyToClipboard(text: string): Promise<boolean> {
  // Tenta API moderna primeiro
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continua para fallback
    }
  }

  // Fallback: textarea + execCommand (funciona em iOS Safari/in-app)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function ShareButton({
  eventId,
  eventTitle,
  eventDate,
  eventImage: _eventImage,
  className,
  iconOnly = false,
  strokeWidth = 2,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const getEventUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/evento/${eventId}`;
  };

  const shareText = `🎉 ${eventTitle}${eventDate ? ` - ${eventDate}` : ""}\n\nConfira no UPPLIN:`;

  const handleCopyLink = async () => {
    const url = getEventUrl();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success("Link copiado!", { description: "Cole onde quiser para compartilhar." });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Não foi possível copiar", {
        description: "Copie manualmente: " + url,
      });
    }
    setOpen(false);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${getEventUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleFacebook = () => {
    const url = encodeURIComponent(getEventUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`${shareText} ${getEventUrl()}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleTelegram = () => {
    const url = encodeURIComponent(getEventUrl());
    const text = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(eventTitle);
    const body = encodeURIComponent(`${shareText}\n${getEventUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  // Native share (mobile) - tenta primeiro, abre menu em fallback
  const handleNativeShareOrMenu = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

    if (canNativeShare) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: getEventUrl(),
        });
        return; // sucesso, não abre menu
      } catch (err) {
        const name = (err as Error)?.name;
        // Se usuário cancelou, simplesmente não faz nada
        if (name === "AbortError") return;
        // Outros erros: cai no menu manual
      }
    }

    // Sem suporte nativo ou erro: abre o menu
    setOpen(true);
  };

  // ===== Modo iconOnly: botão dispara share nativo OU abre menu =====
  if (iconOnly) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={handleNativeShareOrMenu}
            className={className}
            aria-label="Compartilhar evento"
          >
            <Share2 className="h-6 w-6" strokeWidth={strokeWidth} />
          </button>
        </DropdownMenuTrigger>
        <ShareMenuContent
          copied={copied}
          onWhatsApp={handleWhatsApp}
          onFacebook={handleFacebook}
          onTwitter={handleTwitter}
          onTelegram={handleTelegram}
          onEmail={handleEmail}
          onCopy={handleCopyLink}
        />
      </DropdownMenu>
    );
  }

  // ===== Modo botão completo: sempre abre o dropdown =====
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`hover:border-primary hover:text-primary transition-colors [&_svg]:hover:text-primary ${className ?? ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DropdownMenuTrigger>
      <ShareMenuContent
        copied={copied}
        onWhatsApp={handleWhatsApp}
        onFacebook={handleFacebook}
        onTwitter={handleTwitter}
        onTelegram={handleTelegram}
        onEmail={handleEmail}
        onCopy={handleCopyLink}
      />
    </DropdownMenu>
  );
}

interface ShareMenuContentProps {
  copied: boolean;
  onWhatsApp: () => void;
  onFacebook: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  onEmail: () => void;
  onCopy: () => void;
}

function ShareMenuContent({
  copied,
  onWhatsApp,
  onFacebook,
  onTwitter,
  onTelegram,
  onEmail,
  onCopy,
}: ShareMenuContentProps) {
  return (
    <DropdownMenuContent
      align="end"
      className="w-56 z-[100]"
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenuItem onClick={onWhatsApp} className="cursor-pointer">
        <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
        WhatsApp
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onTelegram} className="cursor-pointer">
        <svg className="h-4 w-4 mr-2 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
        </svg>
        Telegram
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onFacebook} className="cursor-pointer">
        <Facebook className="h-4 w-4 mr-2 text-blue-600" />
        Facebook
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onTwitter} className="cursor-pointer">
        <Twitter className="h-4 w-4 mr-2 text-sky-400" />
        X (Twitter)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onEmail} className="cursor-pointer">
        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
        E-mail
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onCopy} className="cursor-pointer">
        {copied ? (
          <Check className="h-4 w-4 mr-2 text-green-500" />
        ) : (
          <Link2 className="h-4 w-4 mr-2" />
        )}
        {copied ? "Copiado!" : "Copiar link"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
