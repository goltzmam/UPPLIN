import { PRIVACY_POLICY } from "../src/content/privacy-policy.ts";
import { escapeHtml } from "../src/lib/seo.ts";

/** Visible initial document, not a crawler-only or noscript copy. React replaces #root on mount. */
export function renderPrivacyHtml() {
  const link = (href: string, label: string) => `<a class="text-primary underline underline-offset-4" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  return `<main data-public-privacy class="min-h-[100dvh] bg-background text-foreground lg:ml-[72px]" style="font-family:system-ui,sans-serif;overflow-wrap:break-word">
<div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24 lg:py-12">
<a href="/" class="text-primary font-bold text-2xl">UPPLIN</a>
<header class="mt-6 mb-10 space-y-3"><h1 class="text-3xl font-bold tracking-tight md:text-4xl">${escapeHtml(PRIVACY_POLICY.title)}</h1><p class="text-sm text-muted-foreground">Última atualização: ${escapeHtml(PRIVACY_POLICY.updatedAt)}</p></header>
<div class="space-y-10"><p class="text-sm leading-relaxed text-muted-foreground">${escapeHtml(PRIVACY_POLICY.introduction)}</p>
<nav aria-label="Nesta política" class="rounded-2xl border border-border bg-card/40 p-5"><h2 class="mb-3 font-semibold">Nesta política</h2><ul class="space-y-2 text-sm">${PRIVACY_POLICY.sections.map(section => `<li>${link(`#${section.id}`, section.title)}</li>`).join("")}</ul></nav>
${PRIVACY_POLICY.sections.map(section => `<section id="${section.id}" class="scroll-mt-6 space-y-3"><h2 class="text-xl font-semibold text-foreground">${escapeHtml(section.title)}</h2><div class="space-y-3 text-sm leading-relaxed text-muted-foreground">${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.links ? `<ul class="space-y-2">${section.links.map(item => `<li>${link(item.href, item.label)}</li>`).join("")}</ul>` : ""}</div></section>`).join("\n")}
</div><nav aria-label="Documentos da UPPLIN" class="mt-6 flex flex-wrap gap-4">${link("/privacidade", "Política de Privacidade")}${link("/termos", "Termos de Uso")}${link("/suporte", "Suporte")}</nav></div></main>`;
}
