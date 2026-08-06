// Presentational activity log / audit trail for an order. Renders OrderEvent rows
// newest-first as a vertical timeline. Used on both the admin and customer order
// detail pages. Purely presentational — the caller passes already-loaded events.

export type TimelineEvent = {
  type: string;
  message: string;
  actor: string;
  createdAt: Date | string;
};

// Dot colour by event category, so the timeline reads at a glance.
const DOT: Record<string, string> = {
  placed: "bg-[#307a07]",
  confirmed: "bg-[#307a07]",
  processing: "bg-[#8a6d1a]",
  packed: "bg-[#2f5c85]",
  shipped: "bg-[#5b4b9b]",
  delivered: "bg-[#307a07]",
  cancelled: "bg-[#a23140]",
  refunded: "bg-[#a23140]",
  return_requested: "bg-[#8a6d1a]",
  return_approved: "bg-[#2f5c85]",
  return_rejected: "bg-[#a23140]",
  return_received: "bg-[#2f5c85]",
  note: "bg-espresso/30",
};

const fmt = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function OrderTimeline({
  events,
  oldestFirst = false,
}: {
  events: TimelineEvent[];
  oldestFirst?: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-espresso/50">No activity yet.</p>;
  }
  // Default newest-first; `oldestFirst` reads the order's story top→bottom
  // (Placed → Processing → … → latest), matching the status stepper.
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return oldestFirst ? diff : -diff;
  });
  return (
    <ol className="relative flex flex-col gap-4 pl-5">
      {/* the vertical rail */}
      <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-line" aria-hidden="true" />
      {sorted.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-5 top-1 h-[7px] w-[7px] rounded-full ring-2 ring-cream ${
              DOT[e.type] ?? "bg-espresso/30"
            }`}
            aria-hidden="true"
          />
          <p className="text-sm text-espresso/85">{e.message}</p>
          <p className="mt-0.5 text-[11px] text-espresso/45">
            {fmt(e.createdAt)}
            {e.actor && e.actor !== "system" ? ` · ${e.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
