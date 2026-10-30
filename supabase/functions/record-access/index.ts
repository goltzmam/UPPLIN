import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminDb, rpc } from "../_shared/account-deletion.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response(null, { status: 405, headers });
  const db = adminDb();
  const { data: { user }, error } = await db.auth.getUser((req.headers.get("Authorization") || "").replace(/^Bearer /i, ""));
  if (error || !user) return new Response(null, { status: 401, headers });
  // Use gateway transport headers, never an IP supplied in the request body.
  const supplied = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const ip = /^[0-9a-fA-F:.]+$/.test(supplied) ? supplied : null;
  try { await rpc(db, "record_private_access", { p_user_id: user.id, p_ip: ip });return new Response(null, { status: 204, headers }); }
  catch { return new Response(null, { status: 503, headers }); }
});
