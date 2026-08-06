// Compact vertical return progress for the customer's return card:
// Return requested → Return approved → Item received → Refunded, each with its
// timestamp. Presentational.

// Four DISPLAY steps mapped onto our real states. `times` (optional) is aligned
// to these four: [requested, approved, received, refunded].
const LABELS = ["Return requested", "Return approved", "Item received", "Refunded"];

type State = "done" | "current" | "upcoming" | "cancelled";

// Highest COMPLETED display-step index for a given return status.
function reached(status: string): number {
  switch (status) {
    case "requested": return 0;
    case "approved": return 1;
    case "received": return 2;
    case "refunded": return 3;
    default: return -1;
  }
}

export default function ReturnProgressMini({ status, times }: { status: string; times?: (string | undefined)[] }) {
  if (status === "rejected" || status === "cancelled") {
    return (
      <ul className="flex flex-col gap-2">
        <Row label="Return requested" state="done" at={times?.[0]} />
        <Row label={status === "rejected" ? "Rejected" : "Cancelled"} state="cancelled" />
      </ul>
    );
  }
  const r = reached(status);
  const terminal = status === "refunded";
  return (
    <ul className="flex flex-col gap-2">
      {LABELS.map((label, i) => {
        const state: State = i <= r ? "done" : i === r + 1 ? (terminal ? "done" : "current") : "upcoming";
        return <Row key={i} label={label} state={state} at={i <= r || state === "current" ? times?.[i] : undefined} />;
      })}
    </ul>
  );
}

function Row({ label, state, at }: { label: string; state: State; at?: string }) {
  const dot =
    state === "done" ? "bg-[#307a07] border-[#307a07] text-white" :
    state === "current" ? "bg-[#847a8a] border-[#847a8a] text-white" :
    state === "cancelled" ? "bg-[#a23140] border-[#a23140] text-white" :
    "bg-white border-[#d4d0cb]";
  const text =
    state === "upcoming" ? "text-[#a7a29b]" :
    state === "cancelled" ? "text-[#a23140] font-medium" :
    state === "current" ? "text-[#1a1a1a] font-medium" : "text-[#1a1a1a]";
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${dot}`}>
        {state === "done" && (
          <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
        {state === "cancelled" && (
          <svg viewBox="0 0 24 24" fill="none" className="h-2 w-2"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>
        )}
      </span>
      <div className="leading-tight">
        <p className={`text-[0.82rem] ${text}`}>{label}</p>
        {at && <p className="text-[0.72rem] text-[#a7a29b]">{at}</p>}
      </div>
    </li>
  );
}
