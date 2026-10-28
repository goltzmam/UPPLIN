import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import { listPublicContent } from "./public-content.ts";
import { renderSitemap } from "./sitemap.ts";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const { events, organizers } = await listPublicContent(env);
writeFileSync("public/sitemap.xml", renderSitemap(events, organizers));
console.log(`Sitemap generated: ${events.length} published events, ${organizers.length} active organizers.`);
