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
