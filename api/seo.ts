import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { publicRest, eventPage, organizerPage, notFoundPage, type PublicEvent, type PublicOrganizer } from "../scripts/public-content.ts";
import { renderSeoHtml, type SeoPage } from "../scripts/seo-html.ts";
let shell: string | undefined;
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); return res.end(); }
  try {
    shell ??= readFileSync(join(process.cwd(), "dist/app-shell.html"), "utf8");
    const path = new URL(req.url || "/", "https://www.upplin.com").searchParams.get("path") || "";
    const match = /^\/(evento|o)\/([a-zA-Z0-9_-]{1,200})$/.exec(path);
    let page: SeoPage | undefined;
    if (match) {
      const [, kind, id] = match;
      const byId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
      const query = new URLSearchParams({ [byId ? "id" : "slug"]: `eq.${id}`, status: kind === "evento" ? "eq.published" : "eq.active", limit: "1" });
      if (kind === "evento") {
        query.set("select", "id,slug,title,description,cover_image_url,start_at,end_at,venue_name,address_text,updated_at");
        const [event] = await publicRest<PublicEvent>("events", query, process.env); if (event) page = eventPage(event);
      } else {
        query.set("select", "id,slug,display_name,description,logo_url,city,updated_at");
        const [org] = await publicRest<PublicOrganizer>("organizer_accounts_public", query, process.env); if (org) page = organizerPage(org);
      }
    }
    res.statusCode = page ? 200 : 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", page ? "public, s-maxage=60, stale-while-revalidate=120" : "public, s-maxage=15");
    if (!page) res.setHeader("X-Robots-Tag", "noindex");
    return res.end(req.method === "HEAD" ? undefined : renderSeoHtml(shell, page || { ...notFoundPage, indexable: false }));
  } catch {
    res.statusCode = 503; res.setHeader("Cache-Control", "no-store"); res.setHeader("Retry-After", "60"); res.setHeader("X-Robots-Tag", "noindex");
    return res.end("Conteúdo temporariamente indisponível. Tente novamente.");
  }
}
