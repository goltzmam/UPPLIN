export function safeMediaUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value);return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
