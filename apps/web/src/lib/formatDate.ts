// Compact, locale-aware timestamp for document lists (e.g. "Jun 8, 3:04 PM").
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
