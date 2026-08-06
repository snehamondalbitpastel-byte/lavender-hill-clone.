"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { AddressData } from "./AddressModal";

// Lazy so the flag-icon bundle only loads when the address modal is opened.
const AddressModal = dynamic(() => import("./AddressModal"), { ssr: false });

// Contact / Addresses / Marketing panels for the account Profile page —
// styled to match the live Shopify customer-account UI (system sans, white
// cards, subdued greys, pill switch). Uses the .account-scope CSS vars.
const CARD =
  "rounded-xl border border-[var(--acc-line)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
const SECTION_TITLE = "text-[1.05rem] font-semibold text-[var(--acc-fg)]";
const PILL_BTN =
  "rounded-full border border-[var(--acc-line)] px-4 py-1.5 text-[0.85rem] text-[var(--acc-fg)] transition-colors hover:bg-[#f6f6f6]";

export default function ProfilePanels({
  email,
  initialName,
  initialMarketing,
  addresses,
}: {
  email: string;
  initialName: string;
  initialMarketing: boolean;
  addresses: AddressData[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [marketing, setMarketing] = useState(initialMarketing);
  const [savingMkt, setSavingMkt] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; initial?: AddressData }>({ open: false });

  function save(patch: { name?: string; marketingConsent?: boolean }) {
    return fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patch.name ?? name,
        marketingConsent: patch.marketingConsent ?? marketing,
      }),
    });
  }

  async function saveName() {
    setSavingName(true);
    await save({ name });
    setSavingName(false);
    setEditing(false);
    // No router.refresh() — the local `name` state already shows the new value,
    // so the update is instant; it's persisted server-side for the admin.
  }

  async function toggleMarketing() {
    if (savingMkt) return;
    const next = !marketing;
    setMarketing(next);
    setSavingMkt(true);
    const res = await save({ marketingConsent: next });
    if (!res.ok) setMarketing(!next);
    setSavingMkt(false);
    router.refresh();
  }

  async function deleteAddress(id: number) {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Contact */}
      <section aria-label="Contact">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={SECTION_TITLE}>Contact</h2>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={PILL_BTN}>
              Edit
            </button>
          )}
        </div>
        <div className={CARD}>
          {!editing ? (
            <>
              <Row label="Email" value={email} />
              {name && <Row label="Name" value={name} border />}
            </>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              <div>
                <p className="mb-1 text-[0.8rem] text-[var(--acc-muted)]">Email</p>
                <p className="text-[0.95rem] text-[var(--acc-fg)] break-all">{email}</p>
              </div>
              <div>
                <label htmlFor="pf-name" className="mb-1 block text-[0.8rem] text-[var(--acc-muted)]">
                  Name
                </label>
                <input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Add your name"
                  className="h-11 w-full rounded-lg border border-[var(--acc-line)] px-3 text-[0.95rem] text-[var(--acc-fg)] outline-none transition-colors focus:border-[#1a1a1a]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveName}
                  disabled={savingName}
                  className="rounded-md bg-[#1a1a1a] px-4 py-2 text-[0.85rem] text-white hover:bg-black disabled:opacity-50"
                >
                  {savingName ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(initialName);
                    setEditing(false);
                  }}
                  className="px-3 text-[0.85rem] text-[var(--acc-muted)] hover:text-[var(--acc-fg)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Addresses */}
      <section aria-label="Addresses">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={SECTION_TITLE}>Addresses</h2>
          <button type="button" onClick={() => setModal({ open: true })} className={PILL_BTN}>
            Add
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className={`${CARD} flex items-center gap-3 p-5`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[var(--acc-muted)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="text-[0.95rem] text-[var(--acc-muted)]">No addresses added</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((a) => (
              <div key={a.id} className={`${CARD} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[0.9rem] leading-relaxed text-[var(--acc-fg)]">
                    {(a.firstName || a.lastName) && (
                      <p className="font-medium">{[a.firstName, a.lastName].filter(Boolean).join(" ")}</p>
                    )}
                    {a.company && <p>{a.company}</p>}
                    <p>{a.address1}</p>
                    {a.address2 && <p>{a.address2}</p>}
                    {[a.city, a.state, a.postcode].filter(Boolean).length > 0 && (
                      <p>{[a.city, a.state, a.postcode].filter(Boolean).join(", ")}</p>
                    )}
                    <p>{a.country}</p>
                    {a.phone && <p className="text-[var(--acc-muted)]">{a.phone}</p>}
                    {a.isDefault && (
                      <span className="mt-2 inline-block rounded-full bg-[#f2f2f2] px-2.5 py-0.5 text-[0.75rem] text-[var(--acc-muted)]">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-3 text-[0.85rem]">
                    <button type="button" onClick={() => setModal({ open: true, initial: a })} className="text-[var(--acc-fg)] hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => a.id && deleteAddress(a.id)} className="text-[#c2334d] hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Marketing preferences */}
      <section aria-label="Marketing preferences">
        <h2 className={`${SECTION_TITLE} mb-3`}>Marketing preferences</h2>
        <div className={`${CARD} flex items-center gap-3 p-5`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[var(--acc-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="flex-1 text-[0.95rem] text-[var(--acc-fg)]">Email</span>
          <button
            type="button"
            role="switch"
            aria-checked={marketing}
            aria-label="Email marketing"
            onClick={toggleMarketing}
            disabled={savingMkt}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              marketing ? "bg-[var(--acc-accent)]" : "bg-[#c9c9c9]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                marketing ? "left-[1.375rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {modal.open && (
        <AddressModal
          initial={modal.initial}
          onClose={() => setModal({ open: false })}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Row({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-4 ${
        border ? "border-t border-[var(--acc-line)]" : ""
      }`}
    >
      <span className="text-[0.9rem] text-[var(--acc-muted)]">{label}</span>
      <span className="text-right text-[0.95rem] text-[var(--acc-fg)] break-all">{value}</span>
    </div>
  );
}
