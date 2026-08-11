"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, codeForCountry, INDIAN_STATES } from "@/lib/countries";
import PhoneCountrySelect from "./PhoneCountrySelect";
import { useT } from "@/app/components/LocaleProvider";

export type AddressData = {
  id?: number;
  country: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  isDefault: boolean;
};

export default function AddressModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AddressData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, locale } = useT();
  const editing = !!initial?.id;
  const startCountry = initial?.country || "India";

  const [country, setCountry] = useState(startCountry);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [address1, setAddress1] = useState(initial?.address1 ?? "");
  const [address2, setAddress2] = useState(initial?.address2 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [phoneCode, setPhoneCode] = useState(codeForCountry(startCountry) || "GB");
  const [phoneNumber, setPhoneNumber] = useState(
    (initial?.phone ?? "").replace(/^\+\d+\s*/, "")
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Localized COUNTRY names for the dropdown — dynamic via Intl.DisplayNames (no
  // hardcoded lists). The stored VALUE stays the English name; only the label changes.
  const regionNames = useMemo(() => {
    try { return new Intl.DisplayNames([locale], { type: "region" }); } catch { return null; }
  }, [locale]);
  const countryLabel = (code: string, fallback: string) => {
    try { return regionNames?.of(code) || fallback; } catch { return fallback; }
  };
  // Localized INDIAN STATE names — machine-translated on demand (cached). Value stays English.
  const [stateMap, setStateMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (locale === "en") return;
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: INDIAN_STATES }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        INDIAN_STATES.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setStateMap(m);
      })
      .catch(() => { /* fall back to English state names */ });
    return () => { cancelled = true; };
  }, [locale]);

  function onCountry(v: string) {
    setCountry(v);
    setPhoneCode(codeForCountry(v) || phoneCode);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!address1.trim()) {
      setError(t("account.err_enter_address", "Please enter an address."));
      return;
    }
    setBusy(true);
    setError("");
    const dial = COUNTRIES.find((c) => c.code === phoneCode)?.dial ?? "";
    const phone = phoneNumber.trim() ? `+${dial} ${phoneNumber.trim()}` : "";
    const body = {
      country,
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      state,
      postcode,
      phone,
      isDefault,
    };
    const res = await fetch(
      editing ? `/api/account/addresses/${initial!.id}` : "/api/account/addresses",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || t("account.err_save_address", "Couldn't save the address."));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative z-[1] flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[1.3rem] font-bold text-[var(--acc-fg)]">
            {editing ? t("account.edit_address", "Edit address") : t("account.add_address", "Add address")}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--acc-muted)] hover:text-[var(--acc-fg)]">
            <svg width="18" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>

        <form onSubmit={save} className="flex flex-col gap-3.5 overflow-y-auto px-6 pb-6">
          {/* Country/region */}
          <div>
            <label htmlFor="addr-country" className="mb-1 block text-[0.72rem] text-[var(--acc-muted)]">
              {t("account.country_region", "Country/region")}
            </label>
            <div className="relative">
              <select
                id="addr-country"
                value={country}
                onChange={(e) => onCountry(e.target.value)}
                className="h-14 w-full appearance-none rounded-lg border border-[var(--acc-line)] bg-white px-3.5 pr-10 text-[0.95rem] text-[var(--acc-fg)] outline-none focus:border-[#1a1a1a]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>
                ))}
              </select>
              <svg width="12" viewBox="0 0 12 8" fill="none" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--acc-muted)]" aria-hidden="true">
                <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Field id="addr-fn" label={t("account.first_name", "First name")} value={firstName} onChange={setFirstName} />
            <Field id="addr-ln" label={t("account.last_name", "Last name")} value={lastName} onChange={setLastName} />
          </div>
          <Field id="addr-co" label={t("account.company", "Company")} value={company} onChange={setCompany} />
          <Field id="addr-a1" label={t("account.address", "Address")} value={address1} onChange={setAddress1} />
          <Field id="addr-a2" label={t("account.apartment", "Apartment, suite, etc")} optionalLabel={t("account.optional", "(optional)")} value={address2} onChange={setAddress2} />
          <div className="grid grid-cols-3 gap-3.5">
            <Field id="addr-city" label={t("account.city", "City")} value={city} onChange={setCity} />
            {country === "India" ? (
              <div className="relative">
                <select
                  id="addr-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="peer h-14 w-full appearance-none rounded-lg border border-[var(--acc-line)] bg-white px-3.5 pr-8 pt-4 text-[0.95rem] text-[var(--acc-fg)] outline-none transition-colors focus:border-[#1a1a1a]"
                >
                  <option value="">{t("account.select", "Select…")}</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{locale === "en" ? st : (stateMap[st] ?? st)}</option>
                  ))}
                </select>
                <label htmlFor="addr-state" className="pointer-events-none absolute left-3.5 top-2.5 text-[0.7rem] text-[var(--acc-muted)]">
                  {t("account.state", "State")}
                </label>
                <svg width="12" viewBox="0 0 12 8" fill="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--acc-muted)]" aria-hidden="true">
                  <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <Field id="addr-state" label={t("account.state", "State")} value={state} onChange={setState} />
            )}
            <Field id="addr-pc" label={t("account.postcode", "Postcode")} value={postcode} onChange={setPostcode} />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-[0.72rem] text-[var(--acc-muted)]">{t("account.phone", "Phone")}</label>
            <div className="flex gap-2">
              <PhoneCountrySelect code={phoneCode} onSelect={(c) => setPhoneCode(c)} />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t("account.phone", "Phone")}
                className="h-14 w-full rounded-lg border border-[var(--acc-line)] bg-white px-3.5 text-[0.95rem] text-[var(--acc-fg)] outline-none focus:border-[#1a1a1a]"
              />
            </div>
          </div>

          {/* Default */}
          <label className="mt-1 flex cursor-pointer select-none items-center gap-2.5">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="peer sr-only" />
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#c4c4c4] bg-white transition-colors peer-checked:border-[var(--acc-accent)] peer-checked:bg-[var(--acc-accent)]">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.6 9.5 3.4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="text-[0.9rem] text-[var(--acc-fg)]">{t("account.default_address", "This is my default address")}</span>
          </label>

          {error && <p className="text-[0.85rem] text-[#c2334d]">{error}</p>}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-[0.9rem] text-[var(--acc-muted)] hover:text-[var(--acc-fg)] disabled:opacity-50">
              {t("account.cancel", "Cancel")}
            </button>
            <button type="submit" disabled={busy} className="rounded-md bg-[#1a1a1a] px-6 py-2.5 text-[0.9rem] text-white hover:bg-black disabled:opacity-50">
              {busy ? t("account.saving", "Saving…") : t("account.save", "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Floating-label text field (label sits inside, floats up on focus / when filled).
function Field({
  id,
  label,
  value,
  onChange,
  optionalLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  optionalLabel?: string; // localized "(optional)" suffix, when the field is optional
}) {
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer h-14 w-full rounded-lg border border-[var(--acc-line)] bg-white px-3.5 pt-4 text-[0.95rem] text-[var(--acc-fg)] outline-none transition-colors focus:border-[#1a1a1a]"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.95rem] text-[var(--acc-muted)] transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[0.7rem] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[0.7rem]"
      >
        {label}
        {optionalLabel ? ` ${optionalLabel}` : ""}
      </label>
    </div>
  );
}
