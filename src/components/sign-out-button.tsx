import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-sm text-olive hover:text-olive-dark underline-offset-4 hover:underline"
      >
        Abmelden
      </button>
    </form>
  );
}
