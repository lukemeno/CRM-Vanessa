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
    <main className="relative flex min-h-full max-lg:flex-col">
      <section className="relative flex w-[28rem] shrink-0 flex-col justify-between overflow-hidden border-r border-olive/15 bg-paper px-12 py-12 max-lg:w-full max-lg:border-r-0 max-lg:px-6 max-lg:py-8">
        <OliveBranch className="pointer-events-none absolute -right-8 -top-4 h-52 w-40 text-olive/30" />
        <div>
          <BrandMark />
          <p className="mt-5 text-sm text-olive-dark/80">
            Alte Hettnerfabrik · Bad Münstereifel
          </p>
        </div>
        <p className="relative max-w-xs text-sm leading-relaxed text-foreground/75 max-lg:mt-6">
          Mit Liebe zum Detail geplant – exklusiv für Euer Fest.
        </p>
      </section>

      <section className="relative flex min-w-0 flex-1 items-center px-16 py-12 max-lg:items-start max-lg:px-6 max-lg:py-8">
        <OliveBranch
          mirrored
          className="pointer-events-none absolute bottom-0 left-8 h-48 w-40 text-olive/20 max-lg:hidden"
        />
        <div className="relative w-full max-w-md">
          <h1 className="font-serif text-3xl text-olive">Anmeldung</h1>
          <p className="mt-2 mb-8 text-sm leading-relaxed text-foreground/80">
            Nur für Vanessa und Luke. Wir schicken dir einen Link per E-Mail.
          </p>
          <LoginForm
            showDevHint={isDevBypassEnabled()}
            initialError={authErrorFromSearchParam(error)}
          />
        </div>
      </section>
    </main>
  );
}
