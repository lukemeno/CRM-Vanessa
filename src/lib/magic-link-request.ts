import { isEmailAllowed } from "@/lib/allowlist";
import { AUTH_ERRORS } from "@/lib/auth-errors";

export type MagicLinkDecision =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function evaluateMagicLinkRequest(
  email: string,
  rawAllowlist: string | undefined = process.env.AUTH_ALLOWLIST,
): MagicLinkDecision {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: AUTH_ERRORS.empty };
  }

  if (!isEmailAllowed(trimmed, rawAllowlist)) {
    return { ok: false, error: AUTH_ERRORS.notAllowed };
  }

  return { ok: true, email: trimmed.toLowerCase() };
}
