import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { OliveBranch } from "@/components/olive-branch";
import { authErrorFromSearchParam } from "@/lib/auth-errors";
import { isDevBypassEnabled } from "@/lib/dev-bypass";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-16">
      <OliveBranch className="pointer-events-none absolute -top-6 right-0 h-56 w-44 text-olive/35" />
      <OliveBranch
        mirrored
        className="pointer-events-none absolute -bottom-8 left-0 h-56 w-44 text-olive/30"
      />

      <section className="relative w-full max-w-md rounded-3xl bg-paper px-8 py-10 shadow-[0_18px_50px_rgba(90,80,50,0.08)]">
        <BrandMark />
        <p className="mt-4 text-center text-sm text-olive-dark/80">
          Alte Hettnerfabrik · Bad Münstereifel
        </p>
        <h1 className="mt-8 font-serif text-2xl text-olive">Anmeldung</h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-foreground/80">
          Nur für Vanessa und Luke. Wir schicken dir einen Link per E-Mail.
        </p>
        <LoginForm
          showDevHint={isDevBypassEnabled()}
          initialError={authErrorFromSearchParam(error)}
        />
      </section>
    </main>
  );
}
