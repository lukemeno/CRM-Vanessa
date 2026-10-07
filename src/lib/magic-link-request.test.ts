import { describe, expect, it } from "vitest";
import { evaluateMagicLinkRequest } from "@/lib/magic-link-request";
import { AUTH_ERRORS } from "@/lib/auth-errors";

const allowlist = "vanessa@events-altehettnerfabrik.de,luke@example.com";

describe("evaluateMagicLinkRequest", () => {
  it("asks for an email when the field is empty", () => {
    const result = evaluateMagicLinkRequest("  ", allowlist);
    expect(result).toEqual({ ok: false, error: AUTH_ERRORS.empty });
  });

  it("returns a German error for unknown emails and does not authorize sending", () => {
    const result = evaluateMagicLinkRequest("unbekannt@example.com", allowlist);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AUTH_ERRORS.notAllowed);
    }
  });

  it("accepts allowlisted operators", () => {
    const result = evaluateMagicLinkRequest(
      " Luke@Example.com ",
      allowlist,
    );
    expect(result).toEqual({ ok: true, email: "luke@example.com" });
  });
});
