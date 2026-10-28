import { PUBLIC_PAGES, SITE_URL, SOCIAL_IMAGE, escapeHtml, safeJson, type PublicPage } from "../src/lib/seo.ts";
export interface SeoPage extends PublicPage { image?: string; schema?: Record<string, unknown>; indexable?: boolean }
export function renderSeoHtml(template: string, page: SeoPage) {
  const canonical = page.canonicalUrl || SITE_URL + page.path;
  const image = page.image || SOCIAL_IMAGE;
  const identity = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "UPPLIN", url: SITE_URL + "/", logo: { "@type": "ImageObject", url: `${SITE_URL}/pwa-512x512.png`, width: 512, height: 512 } },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "UPPLIN", url: SITE_URL + "/", inLanguage: "pt-BR", publisher: { "@id": `${SITE_URL}/#organization` } },
    ...(page.schema ? [page.schema] : [{ "@type": "WebPage", name: page.title, url: canonical, description: page.description, inLanguage: "pt-BR", isPartOf: { "@id": `${SITE_URL}/#website` } }]),
  ] };
  const head = `<title data-rh="true">${escapeHtml(page.title)}</title>
<meta data-rh="true" name="description" content="${escapeHtml(page.description)}" />
<meta data-rh="true" name="robots" content="${page.indexable === false ? "noindex,follow" : "index,follow,max-image-preview:large"}" />
<link data-rh="true" rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:site_name" content="UPPLIN" /><meta property="og:locale" content="pt_BR" />
<meta data-rh="true" property="og:type" content="website" />
<meta data-rh="true" property="og:title" content="${escapeHtml(page.title)}" />
<meta data-rh="true" property="og:description" content="${escapeHtml(page.description)}" />
<meta data-rh="true" property="og:url" content="${escapeHtml(canonical)}" />
<meta data-rh="true" property="og:image" content="${escapeHtml(image)}" />
<meta data-rh="true" property="og:image:alt" content="${escapeHtml(page.heading)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta data-rh="true" name="twitter:title" content="${escapeHtml(page.title)}" />
<meta data-rh="true" name="twitter:description" content="${escapeHtml(page.description)}" />
<meta data-rh="true" name="twitter:image" content="${escapeHtml(image)}" />
<script type="application/ld+json">${safeJson(identity)}</script>`;
  const stripped = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
  const nav = PUBLIC_PAGES.filter(p => ["/eventos", "/por-perto", "/organizadores", "/suporte"].includes(p.path))
    .map(p => `<a href="${p.path}">${escapeHtml(p.heading)}</a>`).join(" · ");
  const body = `<main style="max-width:960px;margin:0 auto;padding:64px 24px;font-family:system-ui;line-height:1.7"><a href="/" style="color:#ff5733;font-size:28px;font-weight:800">UPPLIN</a><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.description)}</p><p>${escapeHtml(page.body)}</p><nav aria-label="Explore a UPPLIN">${nav}</nav></main>`;
  return stripped.replace("</head>", head + "\n</head>").replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body}</div>`);
}
