import { resolveClientEnvironment } from "./client-env.ts";
import { SITE_URL, type PublicPage } from "../src/lib/seo.ts";
import type { SeoPage } from "./seo-html.ts";
export interface PublicEvent { id: string; slug: string | null; title: string; description: string | null; cover_image_url: string | null; start_at: string; end_at: string | null; venue_name: string | null; address_text: string | null; updated_at: string }
export interface PublicOrganizer { id: string; slug: string | null; display_name: string; description: string | null; logo_url: string | null; city: string | null; updated_at: string }
export async function publicRest<T>(resource: string, query: URLSearchParams, env: Record<string, string | undefined>): Promise<T[]> {
  const config = resolveClientEnvironment(env);
  if (config.VITE_SUPABASE_URL !== "https://ermhzlthjlolqsbtjawf.supabase.co" || !config.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error("Public content configuration missing");
  const key = config.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(`${config.VITE_SUPABASE_URL}/rest/v1/${resource}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Public content request failed: ${response.status}`);
  return response.json() as Promise<T[]>;
}
export async function listPublicContent(env: Record<string, string | undefined>) {
  async function paged<T>(resource: string, params: Record<string, string>) {
    const rows: T[] = [];
    for (let offset = 0; offset < 45000; offset += 500) {
      const batch = await publicRest<T>(resource, new URLSearchParams({ ...params, limit: "500", offset: String(offset), order: "id.asc" }), env);
      rows.push(...batch); if (batch.length < 500) break;
    }
    return rows;
  }
  const [events, organizers] = await Promise.all([
    paged<PublicEvent>("events", { select: "id,slug,title,description,cover_image_url,start_at,end_at,venue_name,address_text,updated_at", status: "eq.published" }),
    paged<PublicOrganizer>("organizer_accounts_public", { select: "id,slug,display_name,description,logo_url,city,updated_at", status: "eq.active" }),
  ]);
  return { events, organizers };
}
export function eventPage(event: PublicEvent): SeoPage {
  const path = `/evento/${encodeURIComponent(event.slug || event.id)}`;
  const text = (event.description || `Confira os detalhes e ingressos de ${event.title}${event.venue_name ? ` em ${event.venue_name}` : ""}.`).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = text.length > 160 ? text.slice(0, 157) + "…" : text;
  return { path, title: `${event.title} | Ingressos na UPPLIN`, heading: event.title, description, body: text, image: event.cover_image_url || undefined,
    schema: { "@type": "Event", name: event.title, description, url: SITE_URL + path, startDate: event.start_at, ...(event.end_at ? { endDate: event.end_at } : {}), ...(event.cover_image_url ? { image: [event.cover_image_url] } : {}), eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: { "@type": "Place", name: event.venue_name || event.address_text || "Local a divulgar", ...(event.address_text ? { address: { "@type": "PostalAddress", streetAddress: event.address_text, addressCountry: "BR" } } : {}) } },
  };
}
export function organizerPage(org: PublicOrganizer): SeoPage {
  const path = `/o/${encodeURIComponent(org.slug || org.id)}`;
  const description = (org.description || `Conheça ${org.display_name}${org.city ? ` em ${org.city}` : ""} e acompanhe seus eventos e ingressos na UPPLIN.`).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 160);
  return { path, title: `${org.display_name} — Eventos e ingressos | UPPLIN`, heading: org.display_name, description, body: description, image: org.logo_url || undefined, schema: { "@type": "Organization", name: org.display_name, url: SITE_URL + path, ...(org.logo_url ? { logo: org.logo_url } : {}) } };
}
export const notFoundPage: PublicPage = { path: "/", title: "Página não encontrada | UPPLIN", description: "Explore os eventos publicados e os organizadores na UPPLIN.", heading: "Não encontramos esta página", body: "O conteúdo pode não estar disponível. Explore os eventos e encontre outra experiência." };
