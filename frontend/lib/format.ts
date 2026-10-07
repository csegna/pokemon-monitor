// The backend serializes datetimes without a timezone suffix (SQLite drops
// tzinfo on round-trip - see backend/app/routers/history.py's as_utc() for
// the server-side half of this same issue). Every timestamp the API returns
// is UTC regardless of whether the string says so, so every parse on this
// side has to go through here rather than a bare `new Date(iso)` - passing
// a suffix-less string straight to `Date` makes JS assume *local* time.
export function parseApiDate(iso: string): Date {
  const hasTimezone = /Z$|[+-]\d\d:\d\d$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const date = parseApiDate(iso);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 5) return "just now";
  if (abs < 60) return `${abs}s ${seconds < 0 ? "ago" : "from now"}`;
  if (abs < 3600) return `${Math.round(abs / 60)}m ${seconds < 0 ? "ago" : "from now"}`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h ${seconds < 0 ? "ago" : "from now"}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return parseApiDate(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}
