import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserRoles } from "@/hooks/use-user-roles";
import { PageLoading } from "@/components/ui/loading";

const EXCLUDED = new Set(["painel-migracao", "migrate-sql", "admin-credentials"]);

const rawFiles = import.meta.glob("/supabase/functions/*/index.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Somente os NOMES dos secrets personalizados. Os valores nunca saem do servidor.
const CUSTOM_SECRETS = [
  { name: "MP_ACCESS_TOKEN", where: "Mercado Pago → Suas integrações → Credenciais de produção" },
  { name: "MP_PUBLIC_KEY", where: "Mercado Pago → Suas integrações → Credenciais de produção" },
  { name: "MP_CLIENT_ID", where: "Mercado Pago → Suas integrações → Dados da aplicação" },
  { name: "MP_CLIENT_SECRET", where: "Mercado Pago → Suas integrações → Dados da aplicação" },
  { name: "WEBHOOK_SECRET", where: "Mercado Pago → Webhooks → Assinatura secreta" },
  { name: "RESEND_API_KEY", where: "resend.com → API Keys (crie uma nova)" },
];

const INTEGRATIONS = [
  "Mercado Pago: atualizar a URL do webhook para a função mp-webhook do novo projeto",
  "Mercado Pago OAuth: atualizar a URL de redirecionamento usada por mp-connect",
  "Login com Google: cadastrar o novo callback de autenticação no Google Cloud",
  "Resend: verificar o domínio de envio e o hook de e-mail de autenticação (auth-email-hook)",
  "Auth: configurar Site URL e URLs de redirecionamento (upplin.com, app nativo)",
  "Tarefas agendadas: recriar os agendamentos de expire-pending-orders, check-subscription-expiry e process-email-queue",
];

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PainelMigracao() {
  const { isAdmin, isLoading } = useUserRoles();

  const functions = useMemo(
    () =>
      Object.entries(rawFiles)
        .map(([path, code]) => ({ name: path.split("/")[3], code }))
        .filter((f) => !EXCLUDED.has(f.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const withLocalImports = functions.filter((f) =>
    /from\s+["'](\.\.?\/)[^"']+["']/.test(f.code)
  );

  if (isLoading) return <PageLoading />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const bundle = functions.map((f) => `// ═══ ${f.name} ═══\n${f.code}`).join("\n\n");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-bold">Painel de Migração</h1>
        <p className="mt-2 text-muted-foreground">
          Baixe os complementos e anexe na extensão CloneSupa. O banco será importado pelo arquivo EXPORT (.backup).
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Passo 1 — Edge Functions</h2>
        {functions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma Edge Function para exportar</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{functions.length} funções exportáveis</p>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-sm">
              {functions.map((f) => <li key={f.name} className="font-mono">{f.name}</li>)}
            </ul>
            {withLocalImports.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Precisam também dos arquivos auxiliares do repositório (supabase/functions/_shared e deno.json):{" "}
                <span className="font-mono">{withLocalImports.map((f) => f.name).join(", ")}</span>
              </p>
            )}
          </>
        )}
        <Button className="mt-4" disabled={functions.length === 0} onClick={() => download("edge-functions.ts", bundle)}>
          Baixar edge-functions.ts
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Passo 2 — Secrets personalizados</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Por segurança, os valores não são exibidos nem baixados. Copie cada valor direto da origem e cadastre no novo projeto.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {CUSTOM_SECRETS.map((s) => (
            <li key={s.name}>
              <span className="font-mono font-semibold">{s.name}</span>
              <span className="text-muted-foreground"> — {s.where}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Passo 3 — Conferência dos complementos</h2>
        <p className="mt-2 text-sm">Edge Functions: <b>{functions.length}</b> · Secrets personalizados: <b>{CUSTOM_SECRETS.length}</b></p>
        <p className="mt-3 text-sm text-muted-foreground">
          Na extensão CloneSupa, anexe o .backup em Arquivo EXPORT do Lovable e o arquivo edge-functions.ts em Executar a clonagem. Desmarque a opção de secrets e cadastre-os manualmente no destino.
        </p>
        <h3 className="mt-4 font-semibold">Configurar no destino</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {INTEGRATIONS.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Os arquivos do Storage (fotos, vídeos, anexos) precisam ser transferidos separadamente; o EXPORT contém só os metadados.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Após a migração, remova esta página.</p>
      </section>
    </div>
  );
}
