import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PUBLIC_PAGES } from "../src/lib/seo.ts";
import { renderSeoHtml } from "./seo-html.ts";
import { renderSitemap } from "./sitemap.ts";
import { listPublicContent } from "./public-content.ts";
import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const template = readFileSync(resolve("dist/index.html"), "utf8");
function output(path: string, content: string) { const file = resolve("dist", path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }
output("app-shell.html", template);
for (const page of PUBLIC_PAGES) output(page.path === "/" ? "index.html" : `seo${page.path}.html`, renderSeoHtml(template, page));
let content: Awaited<ReturnType<typeof listPublicContent>> = { events: [], organizers: [] };
try { content = await listPublicContent(env); } catch { console.warn("SEO: public content unavailable at build time; live sitemap endpoint remains authoritative."); }
output("sitemap.xml", renderSitemap(content.events, content.organizers));
console.log(`SEO: ${PUBLIC_PAGES.length} public pages rendered; private routes use noindex app shell.`);
