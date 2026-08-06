"use client";

import { useState } from "react";
import OrderTimeline, { type TimelineEvent } from "./OrderTimeline";

// Activity feed that shows only the most recent `initial` events with a
// "View more / Show less" toggle — keeps a long timeline from towering over the
// card beside it (fixes the empty-gap layout).
export default function CollapsibleActivity({ events, initial = 4 }: { events: TimelineEvent[]; initial?: number }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const shown = showAll ? sorted : sorted.slice(0, initial);
  const hidden = events.length - initial;

  return (
    <div>
      <OrderTimeline events={shown} />
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-espresso/70 transition-colors hover:bg-espresso/[0.04]"
        >
          {showAll ? "Show less ▲" : `View more (${hidden}) ▾`}
        </button>
      )}
    </div>
  );
}
