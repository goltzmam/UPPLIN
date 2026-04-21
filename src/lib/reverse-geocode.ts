/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Caches results in localStorage for 7 days, keyed by rounded coords (~1km).
 */

const CACHE_KEY_PREFIX = "upplin_reverse_geocode_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GeocodeResult {
  city: string | null;
  state: string | null;
}

interface CachedEntry {
  result: GeocodeResult;
  ts: number;
}

function cacheKey(lat: number, lng: number) {
  // Round to ~1km precision (2 decimal places ≈ 1.1km).
  return `${CACHE_KEY_PREFIX}${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

function readCache(lat: number, lng: number): GeocodeResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const parsed: CachedEntry = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, result: GeocodeResult) {
  try {
    const entry: CachedEntry = { result, ts: Date.now() };
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify(entry));
  } catch {
    /* ignore storage errors */
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  const cached = readCache(lat, lng);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR&zoom=10`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address ?? {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      null;
    const state = addr.state || null;
    const result: GeocodeResult = { city, state };
    writeCache(lat, lng, result);
    return result;
  } catch (err) {
    console.warn("[reverseGeocode] failed:", err);
    return null;
  }
}
