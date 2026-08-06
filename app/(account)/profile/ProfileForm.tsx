"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileForm({
  email,
  initialName,
  initialMarketing,
}: {
  email: string;
  initialName: string;
  initialMarketing: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [marketing, setMarketing] = useState(initialMarketing);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, marketingConsent: marketing }),
    });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="max-w-[26rem] rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      {/* Email (read-only — it's the login identity) */}
      <label className="block text-[0.75rem] uppercase tracking-wide text-[#8a8a8a]">
        Email
      </label>
      <p className="mt-1 text-[0.95rem] text-[#1a1a1a]">{email}</p>

      {/* Name */}
      <label
        htmlFor="name"
        className="mt-6 block text-[0.75rem] uppercase tracking-wide text-[#8a8a8a]"
      >
        Name
      </label>
      <input
        id="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        placeholder="Add your name"
        className="mt-1 h-12 w-full rounded-lg border border-[var(--acc-line)] bg-white px-4 text-[0.95rem] text-[#1a1a1a] outline-none transition-colors focus:border-[#1a1a1a]"
      />

      {/* Marketing consent */}
      <label className="mt-5 flex cursor-pointer select-none items-center gap-2.5">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => {
            setMarketing(e.target.checked);
            setSaved(false);
          }}
          className="peer sr-only"
        />
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#c4c4c4] bg-white transition-colors peer-checked:border-[var(--acc-accent)] peer-checked:bg-[var(--acc-accent)]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2 5 8.6 9.5 3.4"
              stroke="#fff"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[0.9rem] text-[#1a1a1a]">
          Email me with news and offers
        </span>
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#1a1a1a] px-5 py-2.5 text-[0.9rem] text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-[0.85rem] text-[#307a07]">Saved</span>}
      </div>
    </form>
  );
}
