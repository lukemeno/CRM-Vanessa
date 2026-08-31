import { auth } from "@/auth";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { isEmailAllowed } from "@/lib/allowlist";
import { formatToday } from "@/lib/timezone";
import { redirect } from "next/navigation";

const sections = [
  {
    title: "Termine",
    empty: "Heute stehen keine Termine an.",
  },
  {
    title: "Nächste Veranstaltungen",
    empty: "Keine anstehenden Veranstaltungen.",
  },
  {
    title: "Offene Zahlungen",
    empty: "Keine offenen Zahlungen.",
  },
  {
    title: "Neue Anfragen",
    empty: "Keine neuen Anfragen.",
  },
] as const;

export const metadata = {
  title: "Heute",
};

export const dynamic = "force-dynamic";

export default async function HeutePage() {
  const session = await auth();
  if (
    !session?.user?.email ||
    !isEmailAllowed(session.user.email)
  ) {
    redirect("/");
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-olive/15 bg-paper/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
          <BrandMark align="left" />
          <div className="text-right">
            <p className="text-sm capitalize text-olive-dark">
              {formatToday()}
            </p>
            <p className="text-xs text-olive/80">{session.user.email}</p>
            <div className="mt-1">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-serif text-3xl text-olive">Heute</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">
          Cockpit für den Tag. Termine, Veranstaltungen, Zahlungen und Anfragen
          folgen in späteren Versionen.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl bg-paper px-5 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)]"
            >
              <h2 className="font-serif text-xl text-olive">{section.title}</h2>
              <p className="mt-3 text-sm text-foreground/70">{section.empty}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
