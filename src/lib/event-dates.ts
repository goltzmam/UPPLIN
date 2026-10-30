/** datetime-local expects wall time, not the UTC prefix of an ISO timestamp. */
export function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}
