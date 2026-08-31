import { Shell } from "@/components/shell";
import { auth } from "@/auth";
import { isEmailAllowed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.email || !isEmailAllowed(session.user.email)) {
    redirect("/");
  }

  return <Shell email={session.user.email}>{children}</Shell>;
}
