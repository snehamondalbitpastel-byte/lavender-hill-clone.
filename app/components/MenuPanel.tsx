"use client";

import { useFetch } from "@/hooks/useFetch";
import { getMenu, type MenuGroup } from "@/lib/api";

// The Shop mega-menu panel content — columns (headings) + their links, loaded
// dynamically from /api/menu (admin-managed). Rendered by the Header inside a
// full-width panel under the header. Returns null when there's no menu data.
export default function MenuPanel() {
  const { data: groups } = useFetch<MenuGroup[]>(getMenu);
  if (!groups || groups.length === 0) return null;

  return (
    <div className="w-full px-6 md:px-12 lg:px-14 py-10">
      <div className="flex flex-wrap gap-x-20 gap-y-10 text-left">
        {groups.map((group) => (
          <div key={group.id} className="flex shrink-0 flex-col gap-4">
            {group.href ? (
              <a href={group.href} className="nav-link-lh text-[0.9rem] tracking-[0.14em] hover:text-taupe transition-colors">
                {group.title}
              </a>
            ) : (
              <span className="nav-link-lh text-[0.9rem] tracking-[0.14em] text-espresso">{group.title}</span>
            )}
            {group.links.length > 0 && (
              <ul className="flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.id}>
                    <a href={link.href} className="text-[15px] text-espresso/70 hover:text-espresso transition-colors">
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
  );
}
