import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth";
import { isEmailAllowed } from "@/lib/allowlist";
import { redirect } from "next/navigation";

export default async function HeuteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.email || !isEmailAllowed(session.user.email)) {
    redirect("/");
  }

  return <AppShell email={session.user.email}>{children}</AppShell>;
}
