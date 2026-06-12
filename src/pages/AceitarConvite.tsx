import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function AceitarConvite() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/admin/aceitar-convite?token=${token}`)}`);
    }
  }, [user, loading, token, navigate]);

  const accept = async () => {
    if (!token) return;
    setState("accepting");
    try {
      const { data, error } = await supabase.rpc("accept_admin_invite", { p_token: token });
      if (error) throw error;
      setState("success");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (e: any) {
      setError(e.message);
      setState("error");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        {state === "idle" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Convite UPPLIN</h1>
            <p className="text-muted-foreground mb-6">Você foi convidado para colaborar com a equipe UPPLIN.</p>
            <Button onClick={accept} className="w-full">Aceitar convite</Button>
          </>
        )}
        {state === "accepting" && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
        {state === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p>Convite aceito! Redirecionando...</p>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => setState("idle")} variant="outline">Tentar novamente</Button>
          </>
        )}
      </Card>
    </div>
  );
}
