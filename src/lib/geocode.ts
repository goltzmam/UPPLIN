// Geocodificação via Nominatim (OpenStreetMap) — sem API key
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 4) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=br&limit=1`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      return {
        lat: Math.round(parseFloat(data[0].lat) * 1000000) / 1000000,
        lng: Math.round(parseFloat(data[0].lon) * 1000000) / 1000000,
      };
    }
    return null;
  } catch {
    return null;
  }
}
