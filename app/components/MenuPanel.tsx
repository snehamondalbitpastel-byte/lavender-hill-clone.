"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getMenu, type MenuGroup } from "@/lib/api";
import { useT } from "./LocaleProvider";

// A nav mega-menu panel — columns (headings + links) for the given `location`
// ("shop" | "about"), loaded from /api/menu (admin-managed). A column with an
// `image` renders as a featured image tile instead of links. Rendered by the
// Header inside a full-width panel under the header. Null when there's no data.
export default function MenuPanel({ location = "shop", open = true }: { location?: string; open?: boolean }) {
  const { data: groups } = useFetch<MenuGroup[]>(() => getMenu(location), `menu:${location}`);
  const { locale } = useT();

  // The column headings, links and captions are admin-managed (dynamic) content —
  // translate them at runtime for the shopper's language (cached server-side),
  // exactly like the order-summary product titles. Value/href stay unchanged.
  const [tmap, setTmap] = useState<Record<string, string>>({});
  const tl = (s: string) => tmap[s] ?? s;
  const strings = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups ?? []) {
      if (g.title) set.add(g.title);
      if (g.caption) set.add(g.caption);
      for (const l of g.links) if (l.label) set.add(l.label);
    }
    return [...set];
  }, [groups]);
  const stringsKey = strings.join("|");
  useEffect(() => {
    if (locale === "en" || strings.length === 0) return;
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: strings }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        strings.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setTmap(m);
      })
      .catch(() => { /* fall back to English menu labels */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringsKey, locale]);

  if (!groups || groups.length === 0) return null;

  // Each column fades + rises into place, staggered, when the panel opens.
  const anim = `transition-all duration-500 ease-out ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`;
  const delay = (i: number) => ({ transitionDelay: open ? `${i * 70}ms` : "0ms" });

  return (
    // Comfortable gap from the screen's left edge (grows on wider screens to
    // ~176px, matching the live About dropdown); image column hugs the right.
    <div className="w-full px-6 md:px-12 lg:px-24 xl:px-44 py-12">
      <div className="flex flex-wrap items-start gap-x-16 gap-y-10 text-left xl:gap-x-24">
        {groups.map((group, i) => {
          // An image column renders as a featured promo tile (clickable when it
          // has an href), with a hover zoom and a centred caption — pushed to the
          // right edge of the panel (ml-auto).
          if (group.image) {
            const promo = (
              <>
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.image}
                    alt={group.caption || ""}
                    className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
                {group.caption && (
                  <p className="mt-4 text-center text-[0.825rem] uppercase tracking-[0.14em] text-espresso/80">{tl(group.caption)}</p>
                )}
              </>
            );
            return group.href ? (
              <a key={group.id} href={group.href} style={delay(i)} className={`group ml-auto block w-[315px] shrink-0 ${anim}`}>
                {promo}
              </a>
            ) : (
              <div key={group.id} style={delay(i)} className={`ml-auto w-[315px] shrink-0 ${anim}`}>{promo}</div>
            );
          }
          return (
            <div key={group.id} style={delay(i)} className={`flex shrink-0 flex-col gap-5 ${anim}`}>
              {group.href ? (
                <a href={group.href} className="nav-link-lh text-[0.9rem] uppercase tracking-[0.16em] hover:text-taupe transition-colors">
                  {tl(group.title)}
                </a>
              ) : (
                <span className="nav-link-lh text-[0.9rem] uppercase tracking-[0.16em] text-espresso">{tl(group.title)}</span>
              )}
              {group.links.length > 0 && (
                <ul className="flex flex-col gap-3.5">
                  {group.links.map((link) => (
                    <li key={link.id}>
                      <a href={link.href} className="text-[15px] text-espresso/70 hover:text-espresso transition-colors">
                        {tl(link.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
