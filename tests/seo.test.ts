import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import seo from "../api/seo.ts";
import sitemap from "../api/sitemap.ts";
import { renderSeoHtml } from "../scripts/seo-html.ts";
import { renderSitemap } from "../scripts/sitemap.ts";
import { PUBLIC_PAGES } from "../src/lib/seo.ts";
import type { PublicEvent } from "../scripts/public-content.ts";
const template = '<html><head><title>old</title><meta name="description" content="old"></head><body><div id="root"></div></body></html>';
const fixture: PublicEvent = { id: "123", slug: "evento-teste", title: 'Evento </script><img src=x onerror=alert(1)>', description: "Detalhes do evento", cover_image_url: null, start_at: "2027-01-10T20:00:00Z", end_at: null, venue_name: "Local", address_text: "Fortaleza", updated_at: "2026-10-28T00:00:00Z" };
const cwd = process.cwd(); let directory: string;
const originalFetch = globalThis.fetch;
const originalUrl = process.env.VITE_SUPABASE_URL; const originalKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
before(() => { directory = mkdtempSync(join(tmpdir(), "upplin-seo-")); mkdirSync(join(directory, "dist")); writeFileSync(join(directory, "dist/app-shell.html"), template); process.chdir(directory); process.env.VITE_SUPABASE_URL = "https://ermhzlthjlolqsbtjawf.supabase.co"; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "public-test-key"; });
afterEach(() => { globalThis.fetch = originalFetch; });
after(() => { process.chdir(cwd); rmSync(directory, { recursive: true }); if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = originalUrl; if (originalKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY; else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalKey; });
function response() {
  const data = { statusCode: 200, headers: {} as Record<string, string>, body: "" };
  const res = { get statusCode() { return data.statusCode; }, set statusCode(value: number) { data.statusCode = value; }, setHeader(name: string, value: string) { data.headers[name.toLowerCase()] = value; }, end(value?: string) { data.body = value || ""; } } as unknown as ServerResponse;
  return { data, res };
}
test("public pages have unique metadata and omit private URLs from the sitemap", () => {
  assert.equal(new Set(PUBLIC_PAGES.map(p => p.title)).size, PUBLIC_PAGES.length);
  const xml = renderSitemap([fixture], []);
  assert.ok(xml.includes("https://www.upplin.com/evento/evento-teste"));
  assert.ok(!/\/login|\/admin|\/checkout/.test(xml));
});
test("HTML and JSON-LD escape user content without inserting executable markup", () => {
  const html = renderSeoHtml(template, { ...PUBLIC_PAGES[0], title: fixture.title, heading: fixture.title, schema: { "@type": "Event", name: fixture.title } });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.equal((html.match(/<title\b/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
});
test("event metadata uses only public published data and a canonical event URL", async () => {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.hostname, "ermhzlthjlolqsbtjawf.supabase.co"); assert.equal(url.searchParams.get("status"), "eq.published");
    assert.equal(new Headers(init?.headers).get("apikey"), "public-test-key");
    return Response.json([fixture]);
  };
  const { data, res } = response(); await seo({ method: "GET", url: "/api/seo?path=/evento/evento-teste" } as IncomingMessage, res);
  assert.equal(data.statusCode, 200); assert.ok(data.body.includes('https://www.upplin.com/evento/evento-teste')); assert.ok(!data.body.includes('<img src=x'));
});
test("missing and invalid event URLs are 404 noindex; arbitrary paths cannot trigger a fetch", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; return Response.json([]); };
  for (const path of ["/evento/ausente", "https://external.invalid/private", "/admin"]) {
    const { data, res } = response(); await seo({ method: "GET", url: "/api/seo?path=" + encodeURIComponent(path) } as IncomingMessage, res);
    assert.equal(data.statusCode, 404); assert.equal(data.headers["x-robots-tag"], "noindex");
  }
  assert.equal(calls, 1);
});
test("public content failure returns retryable 503 instead of a false not-found page", async () => {
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  const { data, res } = response(); await seo({ method: "GET", url: "/api/seo?path=/evento/teste" } as IncomingMessage, res);
  assert.equal(data.statusCode, 503); assert.equal(data.headers["cache-control"], "no-store");
});
test("live sitemap includes newly published records and reads only the public organizer view", async () => {
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.ok(["/rest/v1/events", "/rest/v1/organizer_accounts_public"].includes(url.pathname));
    return Response.json(url.pathname.endsWith("/events") ? [fixture] : []);
  };
  const { data, res } = response(); await sitemap({ method: "GET" } as IncomingMessage, res);
  assert.equal(data.statusCode, 200); assert.ok(data.body.includes("/evento/evento-teste")); assert.equal(data.headers["content-type"], "application/xml; charset=utf-8");
});
