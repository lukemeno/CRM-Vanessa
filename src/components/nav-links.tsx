"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/heute", label: "Heute" },
  { href: "/anfragen", label: "Anfragen" },
  { href: "/kalender", label: "Kalender" },
] as const;

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-1"}>
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              compact
                ? `rounded-md px-2 py-1 text-sm ${active ? "bg-cream font-medium text-olive-dark" : "text-olive hover:text-olive-dark"}`
                : `rounded-lg px-3 py-2 text-sm ${active ? "bg-cream font-medium text-olive-dark" : "text-olive hover:bg-cream/80 hover:text-olive-dark"}`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
