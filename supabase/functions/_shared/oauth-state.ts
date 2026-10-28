const encoder = new TextEncoder();

async function signingKey(secret: string) {
  if (!secret) throw new Error("MP_CLIENT_SECRET is required");
  return await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createOAuthState(userId: string, secret: string, now = Date.now()) {
  const payload = `${userId}.${now + 10 * 60 * 1000}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifyOAuthState(state: string, secret: string, now = Date.now()): Promise<string | null> {
  const parts = state.split(".");
  if (parts.length !== 4 || !secret) return null;
  const [userId, expires, nonce, signature] = parts;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const expiry = Number(expires);
  if (!uuid.test(userId) || !uuid.test(nonce) || !Number.isSafeInteger(expiry) || expiry <= now || expiry > now + 10 * 60 * 1000 || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const bytes = Uint8Array.from(signature.match(/../g)!, b => parseInt(b, 16));
  const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), bytes,
    encoder.encode(parts.slice(0, 3).join(".")));
  return valid ? userId : null;
}
