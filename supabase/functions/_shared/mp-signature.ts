// Validate Mercado Pago notifications before reading or changing application data.
export async function verifyMPSignature(req: Request, rawBody: string, secret: string, now = Date.now()) {
  if (!secret) return false;
  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature || !requestId) return false;
  const parts: Record<string, string> = Object.fromEntries(signature.split(",").map(part => part.trim().split("=", 2)));
  const { ts, v1 } = parts;
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const age = now - Number(ts) * 1000;
  if (!Number.isFinite(age) || age < -60_000 || age > 300_000) return false;
  let body: { data?: { id?: string | number } };
  try { body = JSON.parse(rawBody); } catch { return false; }
  if (!body || typeof body !== "object" || body.data?.id == null) return false;
  const queryId = new URL(req.url).searchParams.get("data.id");
  const bodyId = body?.data?.id?.toString();
  // The signed notification ID must be the same ID used to fetch the payment.
  if (queryId && bodyId && queryId.toLowerCase() !== bodyId.toLowerCase()) return false;
  const id = (queryId || bodyId || "").toLowerCase();
  if (!id) return false;
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(v1.match(/../g)!, b => parseInt(b, 16));
  return await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(manifest));
}
