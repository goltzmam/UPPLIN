import { ADMIN_ORIGIN, APP_ORIGIN, PLANS_ORIGIN, webSurface, legacyAdminUrl } from "./src/lib/web-surfaces.ts";
// Vercel routing middleware uses the standard response headers below.
const next = () => new Response(null, { headers: { "x-middleware-next": "1" } });
const rewrite = (destination: URL, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("x-middleware-rewrite", destination.toString());
  return new Response(null, { ...init, headers });
};
const adminRoutes = new Set(["/", "/login", "/analytics", "/chats", "/moderation", "/users", "/events", "/orders", "/refunds", "/subscriptions", "/cpf", "/settings"]);
const asset = (path: string) => path.startsWith("/assets/") || path.startsWith("/badges/") || /^\/(?:upplin-icon\.svg|favicon(?:-48\.png|-upplin\.png|\.ico)|apple-touch-icon\.png|pwa-\d+x\d+\.png|og-[\w-]+\.(?:jpg|png)|site\.webmanifest)$/.test(path);
export default function proxy(request: Request) {
  const url = new URL(request.url);
  // Enforce the canonical host before filesystem hits (including the homepage).
  if (url.hostname === "upplin.com") return Response.redirect(new URL(url.pathname + url.search, APP_ORIGIN), 308);
  const surface = webSurface(url.hostname);
  if (surface === "app" && ["/index", "/index.html", "/index.htm"].includes(url.pathname)) return Response.redirect(new URL("/" + url.search, APP_ORIGIN), 308);
  if (asset(url.pathname)) return next();
  if (surface === "admin") {
    const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store" };
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { ...headers, "Content-Type": "text/plain" } });
    if (/^\/admin(?:\/|$)/.test(url.pathname)) return Response.redirect(legacyAdminUrl(url.pathname), 308);
    if (!adminRoutes.has(url.pathname)) return Response.redirect(ADMIN_ORIGIN + "/login", 303);
    return rewrite(new URL("/admin-entry.html", url), { headers });
  }
  if (surface === "plans") {
    if (url.pathname === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${PLANS_ORIGIN}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain" } });
    if (url.pathname === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${PLANS_ORIGIN}/</loc></url></urlset>`, { headers: { "Content-Type": "application/xml" } });
    if (url.pathname === "/") return rewrite(new URL("/plans-entry.html", url));
    if (url.pathname === "/planos/organizador") return Response.redirect(PLANS_ORIGIN + "/" + url.search, 308);
    return Response.redirect(APP_ORIGIN + url.pathname + url.search, 303);
  }
  if (url.pathname === "/planos/organizador") return Response.redirect(PLANS_ORIGIN + "/" + url.search, 308);
  if (/^\/admin(?:\/|$)/.test(url.pathname)) return Response.redirect(legacyAdminUrl(url.pathname), 308);
  return next();
}
