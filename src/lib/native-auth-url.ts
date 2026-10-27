export const NATIVE_AUTH_CALLBACK = "com.upplin.app://auth/callback";

export function nativeAuthCode(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "com.upplin.app:" || url.host !== "auth" || !!url.username || !!url.password || url.pathname !== "/callback") return null;
    return url.searchParams.get("code");
  } catch {
    return null;
  }
}

export function safeAppPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return "/";
  return value;
}
