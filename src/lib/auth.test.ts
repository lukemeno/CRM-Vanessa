import { describe, expect, it } from "vitest";
import {
  evaluateMagicLinkRequest,
  isEmailAllowed,
  magicLinkBodySchema,
  parseAllowlist,
} from "@/lib/auth";
import { AUTH_ERRORS } from "@/lib/auth-errors";

describe("parseAllowlist", () => {
  it("splits comma-separated emails and lowercases them", () => {
    const list = parseAllowlist(
      " vanessa@events-altehettnerfabrik.de, Luke@Example.com ",
    );
    expect(list.has("vanessa@events-altehettnerfabrik.de")).toBe(true);
    expect(list.has("luke@example.com")).toBe(true);
    expect(list.size).toBe(2);
  });

  it("returns an empty set when unset", () => {
    expect(parseAllowlist(undefined).size).toBe(0);
  });
});

describe("isEmailAllowed", () => {
  const allowlist = "vanessa@events-altehettnerfabrik.de,luke@example.com";

  it("accepts allowlisted addresses regardless of case", () => {
    expect(isEmailAllowed("Vanessa@events-altehettnerfabrik.de", allowlist)).toBe(
      true,
    );
  });

  it("rejects unknown addresses", () => {
    expect(isEmailAllowed("fremd@example.com", allowlist)).toBe(false);
  });
});

describe("evaluateMagicLinkRequest", () => {
  const allowlist = "vanessa@events-altehettnerfabrik.de,luke@example.com";

  it("returns a German error for unknown emails", () => {
    const result = evaluateMagicLinkRequest("unbekannt@example.com", allowlist);
    expect(result).toEqual({ ok: false, error: AUTH_ERRORS.notAllowed });
  });

  it("accepts allowlisted operators", () => {
    expect(evaluateMagicLinkRequest(" Luke@Example.com ", allowlist)).toEqual({
      ok: true,
      email: "luke@example.com",
    });
  });
});

describe("magicLinkBodySchema", () => {
  it("rejects an empty body at the boundary", () => {
    const parsed = magicLinkBodySchema.safeParse({ email: "  " });
    expect(parsed.success).toBe(false);
  });

  it("accepts a trimmed email string", () => {
    const parsed = magicLinkBodySchema.safeParse({
      email: " vanessa@events-altehettnerfabrik.de ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("vanessa@events-altehettnerfabrik.de");
    }
  });
});
