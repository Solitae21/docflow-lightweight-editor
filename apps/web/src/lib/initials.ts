// Derive up-to-two-letter initials from a display name (e.g. "Ada Lovelace" -> "AL").
// Used by the header avatar, the login picker, and the share list.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}
