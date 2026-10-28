import { PUBLIC_PAGES, SITE_URL, escapeHtml } from "../src/lib/seo.ts";
import { type PublicEvent, type PublicOrganizer } from "./public-content.ts";
export function renderSitemap(events: PublicEvent[], organizers: PublicOrganizer[]) {
  const entries = [
    ...PUBLIC_PAGES.filter(p => !p.canonicalUrl || new URL(p.canonicalUrl).origin === SITE_URL).map(p => ({ path: p.path, updated_at: "", url: p.canonicalUrl || SITE_URL + p.path })),
    ...events.map(e => ({ path: `/evento/${encodeURIComponent(e.slug || e.id)}`, updated_at: e.updated_at, url: SITE_URL + `/evento/${encodeURIComponent(e.slug || e.id)}` })),
    ...organizers.map(o => ({ path: `/o/${encodeURIComponent(o.slug || o.id)}`, updated_at: o.updated_at, url: SITE_URL + `/o/${encodeURIComponent(o.slug || o.id)}` })),
  ];
  const unique = [...new Map(entries.map(e => [e.path, e])).values()].slice(0, 50000);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(e => {
    const date = e.updated_at && Number.isFinite(Date.parse(e.updated_at)) ? `<lastmod>${new Date(e.updated_at).toISOString()}</lastmod>` : "";
    return `  <url><loc>${escapeHtml(e.url)}</loc>${date}</url>`;
  }).join("\n")}\n</urlset>\n`;
}
