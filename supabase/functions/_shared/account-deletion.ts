import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export class PrivacyFailure extends Error { constructor(public code: string) { super(code); } }
export async function receiptHash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, "0")).join("");
}
export function freshReceipt() { return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x => x.toString(16).padStart(2, "0")).join(""); }
export const adminDb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
export type Db = ReturnType<typeof adminDb>;
export async function rpc(db: Db, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new PrivacyFailure(`database_${name}_failed`);
  return data;
}
export async function isBackend(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
  if (Deno.env.get("CRON_SECRET") && token === Deno.env.get("CRON_SECRET")) return true;
  if (!token) return false;
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await caller.rpc("is_backend_service");
  return data === true;
}
export async function revokeApple(token: string, clientId: string, clientSecret: string, transport: typeof fetch = fetch) {
  if (!token) throw new PrivacyFailure("apple_reauthentication_required");
  if (!clientId || !clientSecret) throw new PrivacyFailure("apple_revocation_not_configured");
  const response = await transport("https://appleid.apple.com/auth/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token, token_type_hint: "refresh_token" }) });
  if (!response.ok) throw new PrivacyFailure("apple_revocation_failed");
}
export async function cancelMpSubscription(id: string, token: string, transport: typeof fetch = fetch) {
  if (!token) throw new PrivacyFailure("subscription_cancellation_not_configured");
  const response = await transport(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== "cancelled") throw new PrivacyFailure("subscription_cancellation_failed");
}
export interface DeletionState { providers_revoked: boolean; data_erased: boolean; auth_erased: boolean }
export interface DeletionSteps { providers: () => Promise<void>; storage: () => Promise<void>; data: () => Promise<void>; auth: () => Promise<void>; complete: () => Promise<void> }
export async function runDeletionSteps(state: DeletionState, steps: DeletionSteps) {
  if (!state.providers_revoked) await steps.providers();
  if (!state.data_erased) { await steps.storage(); await steps.data(); }
  if (!state.auth_erased) await steps.auth();
  await steps.complete();
}
async function sendConfirmation(db: Db, id: string) {
  const context = await rpc(db, "deletion_context", { p_job_id: id });
  if (!context?.job || context.job.confirmation_sent) return;
  if (context.job.test_mode || !context.job.contact_email) {
    await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "confirmation_sent" }); return;
  }
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `account-deleted-${id}` }, body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") || "UPPLIN <noreply@upplin.com>", to: [context.job.contact_email], reply_to: "suporte@upplin.com", subject: "Sua conta UPPLIN foi excluída", text: "A exclusão da sua conta e dos dados pessoais associados foi concluída. Registros financeiros mínimos ficam guardados pelo prazo legal de 5 anos; registros de acesso, por 6 meses. Consulte https://www.upplin.com/excluir-conta. Suporte: suporte@upplin.com." }) });
  if (response.ok) await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "confirmation_sent" });
}
export async function processDeletion(db: Db, id: string) {
  let context = await rpc(db, "deletion_context", { p_job_id: id });
  if (!context?.job) throw new PrivacyFailure("job_not_found");
  if (context.job.status === "completed") { await sendConfirmation(db, id); return "completed"; }
  if (!(await rpc(db, "claim_deletion_job", { p_job_id: id }))) return "processing";
  try {
    // Disable future sign-ins before any erasure; storage and database guards block existing sessions too.
    if (!context.job.auth_erased) {
      const { error } = await db.auth.admin.updateUserById(context.job.user_id, { ban_duration: "876000h" });
      if (error && !context.job.data_erased) throw new PrivacyFailure("account_lock_failed");
    }
    await runDeletionSteps(context.job, {
      providers: async () => {
        if (context.apple) await revokeApple(context.apple_token, Deno.env.get("APPLE_CLIENT_ID") || "", Deno.env.get("APPLE_CLIENT_SECRET") || "");
        for (const subscription of context.subscriptions || []) await cancelMpSubscription(subscription, Deno.env.get("MP_ACCESS_TOKEN") || "");
        await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "providers_revoked" });
      },
      storage: async () => {
        for (let page = 0; page < 20; page++) {
          const objects = await rpc(db, "deletion_objects_batch", { p_job_id: id }) as { bucket_id: string; name: string }[];
          if (!objects.length) return;
          for (const bucket of new Set(objects.map(x => x.bucket_id))) {
            const names = objects.filter(x => x.bucket_id === bucket).map(x => x.name);
            const { error } = await db.storage.from(bucket).remove(names);
            if (error) throw new PrivacyFailure("storage_erasure_failed");
            await rpc(db, "mark_deletion_objects", { p_job_id: id, p_bucket: bucket, p_names: names });
          }
        }
        throw new PrivacyFailure("storage_erasure_pending");
      },
      data: async () => { await rpc(db, "erase_account_personal_data", { p_job_id: id }); },
      auth: async () => {
        const { error } = await db.auth.admin.deleteUser(context.job.user_id);
        if (error && error.status !== 404 && error.code !== "user_not_found") throw new PrivacyFailure("auth_erasure_failed");
        await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "auth_erased" });
      },
      complete: async () => { await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "completed" }); },
    });
    await sendConfirmation(db, id);
    return "completed";
  } catch (error) {
    const code = error instanceof PrivacyFailure ? error.code : "deletion_retry_required";
    await rpc(db, "update_deletion_job", { p_job_id: id, p_stage: "retry", p_error: code });
    return "processing";
  }
}
