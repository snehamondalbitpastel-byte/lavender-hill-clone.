import type { CSSProperties } from "react";

// Simple inline stroke icons — no external icon library needed.
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// Shared icon presentation for the header nav icons (account / search / cart).
// Values taken verbatim from the live site's `.header__nav-icon`.
const navIconStyle: CSSProperties = {
  verticalAlign: "middle",
  height: "auto",
  transition: "transform .2s",
  display: "block",
};

// Account / login — exact markup from the live site.
export function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      width="26.5"
      viewBox="0 0 24 24"
      className="header__nav-icon icon icon-account"
      style={navIconStyle}
    >
      <path
        d="M16.125 8.75c-.184 2.478-2.063 4.5-4.125 4.5s-3.944-2.021-4.125-4.5c-.187-2.578 1.64-4.5 4.125-4.5 2.484 0 4.313 1.969 4.125 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.017 20.747C3.783 16.5 7.922 14.25 12 14.25s8.217 2.25 8.984 6.497"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

// Search — exact markup from the live site.
export function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      width="26.5"
      viewBox="0 0 24 24"
      className="header__nav-icon icon icon-search"
      style={navIconStyle}
    >
      <path
        d="M10.364 3a7.364 7.364 0 1 0 0 14.727 7.364 7.364 0 0 0 0-14.727Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <path
        d="M15.857 15.858 21 21.001"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Cart — exact markup from the live site.
export function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      width="26.5"
      viewBox="0 0 24 24"
      className="header__nav-icon icon icon-cart"
      style={navIconStyle}
    >
      <path
        d="M4.75 8.25A.75.75 0 0 0 4 9L3 19.125c0 1.418 1.207 2.625 2.625 2.625h12.75c1.418 0 2.625-1.149 2.625-2.566L20 9a.75.75 0 0 0-.75-.75H4.75Zm2.75 0v-1.5a4.5 4.5 0 0 1 4.5-4.5v0a4.5 4.5 0 0 1 4.5 4.5v1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MenuIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}

export function CloseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

export function ChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function ChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
