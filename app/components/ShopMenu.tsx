"use client";

import { useRef, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getMenu, type MenuGroup } from "@/lib/api";

// "Shop" nav item with a hover mega-menu — groups + links loaded from /api/menu.
// The panel is absolutely positioned against the (sticky) <header>, so it spans
// full width just below the header, mirroring the live site's mega-menu.
export default function ShopMenu() {
  const { data: groups } = useFetch<MenuGroup[]>(getMenu, "menu:all");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small delay so moving the cursor from the "Shop" link down to the panel
  // (across the little gap) doesn't close it.
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <a
        href="/shop"
        aria-expanded={open}
        className="nav-link-lh text-[14.7px] tracking-[0.18em] leading-[1.7] hover:text-taupe transition-colors"
      >
        Shop
      </a>

      {open && groups && groups.length > 0 && (
        <div
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          className="absolute left-0 right-0 top-full z-30 border-t border-line bg-cream shadow-soft-lg"
        >
          <div className="w-full px-6 md:px-12 lg:px-14 py-12">
            {/* content-sized columns that wrap like the live mega-menu:
                the wide T-shirt groups fill row 1, the narrow ones row 2,
                and "Shop All Products" drops to the last row. The gap-x
                controls how many fit per row — tune it if the wrap shifts. */}
            <div className="flex flex-wrap gap-x-24 gap-y-12 text-left">
              {groups.map((group) => (
                <div key={group.id} className="flex shrink-0 flex-col gap-4">
                  <a
                    href={group.href}
                    className="nav-link-lh text-[0.9rem] tracking-[0.14em] hover:text-taupe transition-colors"
                  >
                    {group.title}
                  </a>
                  {group.links.length > 0 && (
                    <ul className="flex flex-col gap-3">
                      {group.links.map((link) => (
                        <li key={link.id}>
                          <a
                            href={link.href}
                            className="text-[15px] text-espresso/70 hover:text-espresso transition-colors"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
