"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "@/app/login-actions";

const initialState: LoginState = {};

export function LoginForm({
  showDevHint,
  initialError,
}: {
  showDevHint: boolean;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState(
    requestMagicLink,
    initialState,
  );

  if (state.sent) {
    return (
      <p className="rounded-xl bg-cream px-4 py-3 text-sm leading-relaxed text-olive-dark">
        {showDevHint
          ? "Der Anmeldelink steht in der Serverkonsole. Es wurde keine Mail verschickt."
          : "Wir haben dir einen Anmeldelink per E-Mail geschickt. Bitte prüfe dein Postfach."}
      </p>
    );
  }

  const error = state.error ?? initialError;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">
          E-Mail-Adresse
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="vanessa@events-altehettnerfabrik.de"
          className="w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 placeholder:text-olive/40 focus:border-olive focus:ring-2"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-olive px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
      >
        {pending ? "Wird gesendet…" : "Anmeldelink senden"}
      </button>

      {showDevHint ? (
        <p className="text-xs leading-relaxed text-olive/70">
          Entwicklung: Der Anmeldelink erscheint in der Serverkonsole, es wird
          keine Mail verschickt.
        </p>
      ) : null}
    </form>
  );
}
