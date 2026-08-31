import Link from "next/link";
import type { HeuteItem } from "@/domain/heute";

export function HeuteSection({
  title,
  empty,
  href,
  items,
}: {
  title: string;
  empty: string;
  href: string;
  items: HeuteItem[];
}) {
  return (
    <section className="min-h-52 min-w-0 overflow-x-auto rounded-2xl bg-paper px-6 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)]">
      <h2 className="font-serif text-xl text-olive">
        <Link href={href} className="hover:text-olive-dark">
          {title}
        </Link>
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/70">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={`${item.href}-${item.detail ?? ""}`}>
              <Link
                href={item.href}
                className="block rounded-xl border border-olive/10 bg-cream px-4 py-3 transition hover:border-olive/30"
              >
                <p className="font-serif text-lg leading-snug text-olive">
                  {item.title}
                </p>
                {item.detail ? (
                  <p className="mt-1 text-sm text-olive/80">{item.detail}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
