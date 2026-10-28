export class EmailProviderError extends Error {
  constructor(public status: number, public retryAfterSeconds: number | null = null) {
    super(`Email provider returned HTTP ${status}`);
    this.name = "EmailProviderError";
  }
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(message: EmailMessage, apiKey: string, idempotencyKey: string, fetcher: typeof fetch = fetch) {
  if (!apiKey || !idempotencyKey) throw new Error("Email credentials and idempotency key are required");
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ ...message, to: [message.to] }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    const retry = Number(response.headers.get("Retry-After"));
    throw new EmailProviderError(response.status, Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return await response.json() as { id: string };
}
