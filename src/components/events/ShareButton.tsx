import { useState } from "react";
import { Share2, Check, MessageCircle, Instagram, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonProps {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventImage?: string | null;
  className?: string;
  iconOnly?: boolean;
  strokeWidth?: number;
}

export function ShareButton({
  eventId,
  eventTitle,
  eventDate,
  eventImage,
  className,
  iconOnly = false,
  strokeWidth = 2,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getEventUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/evento/${eventId}`;
  };

  const shareText = `🎉 ${eventTitle}${eventDate ? ` - ${eventDate}` : ""}\n\nConfira no UPPLIN:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getEventUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Erro ao copiar link");
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${getEventUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleInstagramStories = () => {
    // Instagram Stories can be shared via mobile deep link
    // On desktop, we'll copy the link and show instructions
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // On mobile, try to open Instagram with the link
      const instagramUrl = `instagram://story-camera`;
      window.open(instagramUrl, "_blank");
      // Copy the link so user can paste it
      navigator.clipboard.writeText(getEventUrl());
    } else {
      // On desktop, copy link
      navigator.clipboard.writeText(getEventUrl());
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: getEventUrl(),
        });
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Check if native share is available
  const canNativeShare = typeof navigator.share === "function";

  if (canNativeShare && iconOnly) {
    return (
      <button
        onClick={handleNativeShare}
        className={className}
        aria-label="Compartilhar evento"
      >
        <Share2 className="h-6 w-6" strokeWidth={strokeWidth} />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconOnly ? (
          <button className={className} aria-label="Compartilhar evento">
            <Share2 className="h-6 w-6" strokeWidth={strokeWidth} />
          </button>
        ) : (
          <Button variant="outline" size="sm" className={`hover:border-primary hover:text-primary transition-colors [&_svg]:hover:text-primary ${className}`}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleInstagramStories} className="cursor-pointer">
          <Instagram className="h-4 w-4 mr-2 text-pink-500" />
          Instagram Stories
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Link2 className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copiado!" : "Copiar link"}
        </DropdownMenuItem>
        {canNativeShare && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Share2 className="h-4 w-4 mr-2" />
            Mais opções
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
