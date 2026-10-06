"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/indents", label: "All Indents" },
  { href: "/indents/new", label: "New Indent" },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      className="no-print"
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--navy)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>
          Organize Indent
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
          Material request console
        </div>
      </div>

      <nav style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {links.map((l) => {
          const isActive =
            l.href === "/indents/new"
              ? pathname.startsWith("/indents/new")
              : pathname === "/indents";
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: "block",
                padding: "8px 12px",
                borderRadius: 3,
                fontSize: 13.5,
                fontWeight: 500,
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
          Approval workflow is handled by another team. This console covers
          create, save, submit, and manage.
        </div>
      </div>
    </aside>
  );
}
