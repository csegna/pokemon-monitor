import { formatDateTime } from "@/lib/format";
import type { RestockEvent } from "@/lib/types";

export function RestockTimeline({ events }: { events: RestockEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-text-secondary">No restocks recorded yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {events.map((event, i) => (
        <div
          key={event.id}
          className={`grid grid-cols-[108px_1fr] items-center gap-3.5 py-3 sm:grid-cols-[108px_1fr_auto] ${
            i > 0 ? "border-t border-border" : ""
          }`}
        >
          <div className="font-mono text-xs text-text-muted">{formatDateTime(event.detected_at)}</div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="truncate text-sm font-semibold">{event.product_name}</div>
            <div className="text-xs text-text-secondary">{event.store}</div>
          </div>
          <div className="font-mono text-xs text-text-muted">
            {event.notified_at ? "notified" : "not notified"}
          </div>
        </div>
      ))}
    </div>
  );
}
