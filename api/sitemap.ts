import type { IncomingMessage, ServerResponse } from "node:http";
import { listPublicContent } from "../scripts/public-content.ts";
import { renderSitemap } from "../scripts/sitemap.ts";
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); return res.end(); }
  try {
    const { events, organizers } = await listPublicContent(process.env);
    res.setHeader("Content-Type", "application/xml; charset=utf-8"); res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return res.end(req.method === "HEAD" ? undefined : renderSitemap(events, organizers));
  } catch { res.statusCode = 503; res.setHeader("Retry-After", "60"); res.setHeader("Cache-Control", "no-store"); return res.end("Sitemap temporariamente indisponível"); }
}
