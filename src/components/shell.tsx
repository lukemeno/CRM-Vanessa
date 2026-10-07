import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { formatToday } from "@/lib/timezone";

export function Shell({
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
        <div className="mt-8">
          <NavLinks />
        </div>
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
          <NavLinks compact />
          <div className="min-w-0 text-right">
            <p className="truncate text-xs text-olive/80">{email}</p>
            <SignOutButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto px-10 py-8 max-lg:px-4 max-lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
