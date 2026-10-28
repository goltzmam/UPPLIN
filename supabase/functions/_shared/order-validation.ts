export function validateOrderItems(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return "Missing items";
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object" || typeof item.ticket_type_id !== "string" || !item.ticket_type_id || !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 10) {
      return "Invalid item: qty must be an integer between 1 and 10";
    }
    if (seen.has(item.ticket_type_id)) return "Duplicate ticket type";
    seen.add(item.ticket_type_id);
  }
  return null;
}

export function isSaleOpen(start: string | null, end: string | null, now = Date.now()) {
  return (!start || Date.parse(start) <= now) && (!end || now <= Date.parse(end));
}
