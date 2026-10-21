// Runs before `vite dev` and `vite build` (predev/prebuild); writes public/sitemap.xml.
// Pulls published events and active organizers from Supabase to include dynamic routes.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://upplin.com";

const SUPABASE_URL = "https://ermhzlthjlolqsbtjawf.supabase.co";
const SUPABASE_ANON =
  "sb_publishable_2NH-BIiNgWir_VgmwWWG8g_EJpcDChi";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/eventos", changefreq: "daily", priority: "0.9" },
  { path: "/por-perto", changefreq: "daily", priority: "0.8" },
  { path: "/explorar-organizadores", changefreq: "weekly", priority: "0.7" },
  { path: "/organizadores", changefreq: "monthly", priority: "0.6" },
  { path: "/precos", changefreq: "monthly", priority: "0.6" },
  { path: "/planos/organizador", changefreq: "monthly", priority: "0.5" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/cadastro", changefreq: "yearly", priority: "0.3" },
];

async function fetchRest(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function build() {
  const events = await fetchRest(
    "events?select=slug,id,updated_at,start_at&status=eq.published&order=start_at.desc&limit=2000",
  );
  const organizers = await fetchRest(
    "organizer_accounts?select=slug,updated_at&status=eq.active&slug=not.is.null&limit=2000",
  );

  const dynamicEntries: SitemapEntry[] = [
    ...events
      .filter((e: any) => e.slug || e.id)
      .map((e: any) => ({
        path: `/evento/${e.slug || e.id}`,
        lastmod: e.updated_at ? new Date(e.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly" as const,
        priority: "0.8",
      })),
    ...organizers
      .filter((o: any) => o.slug)
      .map((o: any) => ({
        path: `/o/${o.slug}`,
        lastmod: o.updated_at ? new Date(o.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly" as const,
        priority: "0.6",
      })),
  ];

  const entries = [...staticEntries, ...dynamicEntries];

  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

build().catch((err) => {
  console.error("sitemap generation failed:", err);
  // Fail-soft: write static-only sitemap so build doesn't break.
  const urls = staticEntries
    .map(
      (e) =>
        `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");
  writeFileSync(
    resolve("public/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
});
