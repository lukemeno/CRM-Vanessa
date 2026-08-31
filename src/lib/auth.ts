import { z } from "zod";
import { AUTH_ERRORS } from "@/lib/auth-errors";

export function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(
  email: string,
  rawAllowlist: string | undefined = process.env.AUTH_ALLOWLIST,
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return parseAllowlist(rawAllowlist).has(normalized);
}

export const magicLinkBodySchema = z.object({
  email: z.string().trim().min(1, AUTH_ERRORS.empty),
});

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
