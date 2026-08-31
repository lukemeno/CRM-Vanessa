import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { formatToday } from "@/lib/timezone";
import Link from "next/link";

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-olive/15 bg-paper px-5 py-6 max-lg:hidden">
        <BrandMark size="compact" />
        <p className="mt-3 text-xs leading-relaxed text-olive/70">
          Alte Hettnerfabrik
        </p>
        <nav className="mt-8 flex flex-col gap-1">
          <Link
            href="/heute"
            className="rounded-lg bg-cream px-3 py-2 text-sm font-medium text-olive-dark"
          >
            Heute
          </Link>
        </nav>
        <div className="mt-auto border-t border-olive/10 pt-4">
          <p className="text-sm capitalize text-olive-dark">{formatToday()}</p>
          <p className="mt-1 truncate text-xs text-olive/80">{email}</p>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-between gap-4 border-b border-olive/15 bg-paper px-4 py-3 max-lg:flex">
          <BrandMark size="compact" />
          <div className="flex items-center gap-3 text-right">
            <div className="min-w-0">
              <p className="truncate text-xs text-olive/80">{email}</p>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto px-10 py-8 max-lg:px-4 max-lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
