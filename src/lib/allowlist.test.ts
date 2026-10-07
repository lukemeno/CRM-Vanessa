import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowlist } from "@/lib/allowlist";

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
    expect(parseAllowlist("").size).toBe(0);
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

  it("rejects empty input", () => {
    expect(isEmailAllowed("  ", allowlist)).toBe(false);
  });
});
