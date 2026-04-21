/**
 * Distância em km entre dois pontos (lat/lng) usando Haversine.
 * Retorna Infinity se algum dos pontos for inválido.
 */
export function haversineKm(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined,
): number {
  if (!a || !b) return Infinity;
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return Infinity;
  }
  const R = 6371; // km
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Reordena itens priorizando os que possuem lat/lng dentro de `radiusKm`
 * do usuário. Mantém a ordem relativa original dentro de cada grupo
 * (próximos primeiro, ordenados por distância; demais depois, na ordem
 * original).
 */
export function prioritizeNearbyItems<
  T extends { lat?: number | null; lng?: number | null },
>(
  items: T[],
  user: { lat: number; lng: number } | null | undefined,
  radiusKm = 80,
): T[] {
  if (!user) return items;

  const nearby: { item: T; d: number }[] = [];
  const others: T[] = [];

  for (const item of items) {
    if (typeof item.lat === "number" && typeof item.lng === "number") {
      const d = haversineKm(user, { lat: item.lat, lng: item.lng });
      if (d <= radiusKm) {
        nearby.push({ item, d });
        continue;
      }
    }
    others.push(item);
  }

  nearby.sort((a, b) => a.d - b.d);
  return [...nearby.map((n) => n.item), ...others];
}
