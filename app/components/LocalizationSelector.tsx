"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "./Icons";

// Country / currency selector, mirroring the live site's localization popover.
// A curated country list (the live store lists 200+); India is the default,
// matching the IN storefront. Non-functional beyond updating the display.
const COUNTRIES = [
  { code: "IN", name: "India", currency: "INR ₹", flag: "/flags/in.jpg" },
  { code: "GB", name: "United Kingdom", currency: "GBP £", flag: "/flags/gb.jpg" },
  { code: "US", name: "United States", currency: "USD $", flag: "/flags/us.jpg" },
  { code: "CA", name: "Canada", currency: "CAD $", flag: "/flags/ca.jpg" },
  { code: "AU", name: "Australia", currency: "AUD $", flag: "/flags/au.jpg" },
  { code: "NZ", name: "New Zealand", currency: "NZD $", flag: "/flags/nz.jpg" },
  { code: "IE", name: "Ireland", currency: "EUR €", flag: "/flags/ie.jpg" },
  { code: "DE", name: "Germany", currency: "EUR €", flag: "/flags/de.jpg" },
  { code: "FR", name: "France", currency: "EUR €", flag: "/flags/fr.jpg" },
  { code: "IT", name: "Italy", currency: "EUR €", flag: "/flags/it.jpg" },
  { code: "JP", name: "Japan", currency: "JPY ¥", flag: "/flags/jp.jpg" },
  { code: "CN", name: "China", currency: "CNY ¥", flag: "/flags/cn.jpg" },
  { code: "SG", name: "Singapore", currency: "SGD $", flag: "/flags/sg.jpg" },
  { code: "HK", name: "Hong Kong SAR", currency: "HKD $", flag: "/flags/hk.jpg" },
];

export default function LocalizationSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(COUNTRIES[0]);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Change country or currency"
        className="flex items-center gap-2 nav-link-lh text-[13px] text-espresso/70"
      >
        <Image
          src={selected.flag}
          alt={selected.name}
          width={26}
          height={20}
          className="w-[22px] h-auto"
        />
        <span>{selected.currency}</span>
        <ChevronDown className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Country"
          className="absolute right-0 top-full mt-3 w-64 max-h-80 overflow-y-auto bg-cream border border-line shadow-soft-lg z-50 py-2"
        >
          <p className="px-4 pb-2 pt-1 eyebrow text-espresso/60">Country</p>
          <ul role="listbox">
            {COUNTRIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === selected.code}
                  onClick={() => {
                    setSelected(c);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-beige transition-colors ${
                    c.code === selected.code ? "font-medium" : "text-espresso/80"
                  }`}
                >
                  <Image
                    src={c.flag}
                    alt={c.name}
                    width={24}
                    height={18}
                    className="w-6 h-auto shrink-0"
                  />
                  <span>
                    {c.name} ({c.currency})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
