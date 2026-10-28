import { PUBLIC_PAGES, SITE_URL, escapeHtml } from "../src/lib/seo.ts";
import { type PublicEvent, type PublicOrganizer } from "./public-content.ts";
export function renderSitemap(events: PublicEvent[], organizers: PublicOrganizer[]) {
  const entries = [
    ...PUBLIC_PAGES.map(p => ({ path: p.path, updated_at: "" })),
    ...events.map(e => ({ path: `/evento/${encodeURIComponent(e.slug || e.id)}`, updated_at: e.updated_at })),
    ...organizers.map(o => ({ path: `/o/${encodeURIComponent(o.slug || o.id)}`, updated_at: o.updated_at })),
  ];
  const unique = [...new Map(entries.map(e => [e.path, e])).values()].slice(0, 50000);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(e => {
    const date = e.updated_at && Number.isFinite(Date.parse(e.updated_at)) ? `<lastmod>${new Date(e.updated_at).toISOString()}</lastmod>` : "";
    return `  <url><loc>${escapeHtml(SITE_URL + e.path)}</loc>${date}</url>`;
  }).join("\n")}\n</urlset>\n`;
}
