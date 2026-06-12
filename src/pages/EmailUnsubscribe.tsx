import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function EmailUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const confirm = async () => {
    if (!token) return;
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("marketing-unsubscribe", { body: { token } });
      if (error) throw error;
      setMsg(data?.email || "");
      setState("done");
    } catch (e: any) {
      setMsg(e.message);
      setState("error");
    }
  };

  useEffect(() => {
    if (token && state === "idle") confirm();
  }, [token]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Descadastrar emails</h1>
        {state === "loading" && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
        {state === "done" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p>Pronto! {msg && <span className="font-medium">{msg}</span>} não receberá mais emails de marketing da UPPLIN.</p>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">{msg || "Link inválido ou expirado."}</p>
            <Button onClick={confirm} variant="outline" className="mt-4">Tentar novamente</Button>
          </>
        )}
      </Card>
    </div>
  );
}
