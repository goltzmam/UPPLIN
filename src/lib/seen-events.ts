const SEEN_EVENTS_KEY = "upplin_seen_events";
const MAX_SEEN_EVENTS = 200; // Keep last 200 seen event IDs

interface SeenEntry {
  id: string;
  /** Unix timestamp (ms) when last seen */
  at: number;
}

function getSeenEntries(): SeenEntry[] {
  try {
    const raw = localStorage.getItem(SEEN_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeenEntries(entries: SeenEntry[]) {
  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(-MAX_SEEN_EVENTS);
    localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Mark one or more events as seen.
 */
export function markEventsSeen(eventIds: string[]) {
  const entries = getSeenEntries();
  const existingMap = new Map(entries.map(e => [e.id, e]));
  const now = Date.now();

  for (const id of eventIds) {
    existingMap.set(id, { id, at: now });
  }

  saveSeenEntries(Array.from(existingMap.values()));
}

/**
 * Get a Set of event IDs seen in the last `withinMs` milliseconds.
 * Default: 24 hours.
 */
export function getSeenEventIds(withinMs = 1000 * 60 * 60 * 24): Set<string> {
  const cutoff = Date.now() - withinMs;
  const entries = getSeenEntries().filter(e => e.at >= cutoff);
  return new Set(entries.map(e => e.id));
}

/**
 * Reorder feed items: unseen events first (preserving original order),
 * then seen events after. This ensures the user always sees fresh
 * content at the top without losing access to previously seen events.
 */
export function prioritizeUnseenEvents<T extends { id: string }>(
  items: T[],
  withinMs?: number
): T[] {
  const seen = getSeenEventIds(withinMs);
  if (seen.size === 0) return items;

  const unseen: T[] = [];
  const seenItems: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      seenItems.push(item);
    } else {
      unseen.push(item);
    }
  }

  return [...unseen, ...seenItems];
}
