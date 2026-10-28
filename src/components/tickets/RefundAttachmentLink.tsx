import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function RefundAttachmentLink({ path, index }: { path: string; index: number }) {
  const [loading, setLoading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const open = async () => {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from("refund-attachments").createSignedUrl(path, 300);
      if (error || !data?.signedUrl) throw error || new Error("Attachment unavailable");
      if (popup) popup.location.replace(data.signedUrl);
      else setFallbackUrl(data.signedUrl);
    } catch {
      popup?.close();
      toast({ title: "Não foi possível abrir o anexo", description: "Tente novamente.", variant: "destructive" });
    } finally { setLoading(false); }
  };
  return fallbackUrl ? <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Abrir anexo {index + 1}</a> :
    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={loading} onClick={() => void open()}>{loading ? "Abrindo…" : `📎 Anexo ${index + 1}`}</Button>;
}
