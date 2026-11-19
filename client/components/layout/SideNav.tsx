"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavLink {
  href: string;
  label: string;
}

// Side navigation: only entries the user may use (DEC-019), active entry marked
// with aria-current. On narrow screens it becomes a top bar.
export default function SideNav({
  links,
  userLabel,
  children,
}: {
  links: NavLink[];
  userLabel: string;
  /** Dev user switcher slot. */
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/indents/new" ? pathname.startsWith("/indents/new") : pathname === "/indents" || (pathname.startsWith("/indents/") && !pathname.startsWith("/indents/new"));

  return (
    <aside className="no-print flex shrink-0 flex-col bg-[var(--navy)] text-white md:min-h-screen md:w-56">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-[13px] font-bold tracking-wide">Organize Indent</div>
        <div className="mt-0.5 text-[11px] text-white/60">Material request console</div>
      </div>

      <nav aria-label="Main" className="flex flex-row gap-1 p-2 md:flex-col md:p-3">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-[3px] px-3 py-2 text-[13.5px] font-medium ${
                active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="border-t border-white/10 px-4 py-2 text-[11.5px] text-white/70" aria-label="Current user">
          {userLabel}
        </div>
        {children}
      </div>
    </aside>
  );
}
