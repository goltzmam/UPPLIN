/**
 * Reverse-geocoding utilitário usando Nominatim (OpenStreetMap).
 *
 * - Gratuito, sem API key.
 * - Cache em localStorage por coordenada arredondada (~1km).
 * - Respeita rate-limit suave: 1 req/coord cacheada.
 *
 * Caso o serviço falhe, retorna null silenciosamente — o app continua
 * funcionando apenas com lat/lng.
 */

export interface ReverseGeoResult {
  city: string | null;
  state: string | null;
  countryCode: string | null;
}

const CACHE_KEY = "upplin:revgeo:v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

interface CacheEntry extends ReverseGeoResult {
  at: number;
}

function roundCoord(n: number) {
  // ~1.1 km de precisão em latitudes médias
  return Math.round(n * 100) / 100;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  const key = `${roundCoord(lat)},${roundCoord(lng)}`;
  const cache = readCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { city: cached.city, state: cached.state, countryCode: cached.countryCode };
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
      `&zoom=10&addressdetails=1&accept-language=pt-BR`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.village ||
      addr.county ||
      null;
    const state = addr.state || addr.region || null;
    const countryCode = (addr.country_code || "").toUpperCase() || null;

    const result: ReverseGeoResult = { city, state, countryCode };
    cache[key] = { ...result, at: Date.now() };
    writeCache(cache);
    return result;
  } catch {
    return null;
  }
}
