import { auth } from "@/auth";
import { isEmailAllowed } from "@/lib/allowlist";
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
  if (!session?.user?.email || !isEmailAllowed(session.user.email)) {
    redirect("/");
  }

  return (
    <>
      <h1 className="font-serif text-3xl text-olive">Heute</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/80">
        Cockpit für den Tag. Termine, Veranstaltungen, Zahlungen und Anfragen
        folgen in späteren Versionen.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        {sections.map((section) => (
          <section
            key={section.title}
            className="min-h-52 min-w-0 overflow-x-auto rounded-2xl bg-paper px-6 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)]"
          >
            <h2 className="font-serif text-xl text-olive">{section.title}</h2>
            <p className="mt-3 text-sm text-foreground/70">{section.empty}</p>
          </section>
        ))}
      </div>
    </>
  );
}
