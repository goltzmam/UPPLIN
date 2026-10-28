export const APP_ORIGIN = "https://www.upplin.com";
export const ADMIN_ORIGIN = "https://admin.upplin.com";
export const PLANS_ORIGIN = "https://planos.upplin.com";
export type WebSurface = "app" | "admin" | "plans";
export function webSurface(hostname: string, native = false): WebSurface {
  if (native) return "app";
  if (hostname === "admin.upplin.com") return "admin";
  if (hostname === "planos.upplin.com") return "plans";
  return "app";
}
export function legacyAdminUrl(pathname: string) {
  const path = pathname.replace(/^\/admin(?=\/|$)/, "") || "/";
  return ADMIN_ORIGIN + path;
}
export type RecoveryAudience = "participant" | "organizer";
export function recoveryRoutes(audience: RecoveryAudience) {
  return audience === "organizer"
    ? { request: "/organizador/recuperar-senha", reset: "/organizador/redefinir-senha", login: "/organizador/login" }
    : { request: "/recuperar-senha", reset: "/redefinir-senha", login: "/login" };
}

export function legacyRecoveryDestination(path: string, search: string, hash = "") {
  const query = new URLSearchParams(search);
  if (query.get("tipo") !== "organizador" || !["/recuperar-senha", "/redefinir-senha"].includes(path)) return null;
  query.delete("tipo");
  return "/organizador" + path + (query.size ? "?" + query.toString() : "") + hash;
}
