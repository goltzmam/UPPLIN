import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminDb, rpc, isBackend, processDeletion } from "../_shared/account-deletion.ts";
serve(async req => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  if (!(await isBackend(req))) return new Response("Unauthorized", { status: 401 });
  try {
    const db = adminDb();
    const jobs = await rpc(db, "pending_deletion_jobs") as { id: string }[];
    for (const job of jobs) await processDeletion(db, job.id);
    await rpc(db, "prune_privacy_retention");
    return Response.json({ processed: jobs.length });
  } catch { return Response.json({ error: "worker_retry_required" }, { status: 503 }); }
});
