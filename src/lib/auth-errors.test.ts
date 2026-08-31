import { describe, expect, it } from "vitest";
import {
  AUTH_ERRORS,
  authErrorFromSearchParam,
  magicLinkSendSucceeded,
} from "@/lib/auth-errors";

describe("magicLinkSendSucceeded", () => {
  it("treats a verify-request URL as success", () => {
    expect(
      magicLinkSendSucceeded("http://localhost:3000/api/auth/verify-request"),
    ).toBe(true);
  });

  it("fails closed when Auth.js puts an error on the redirect", () => {
    expect(
      magicLinkSendSucceeded("http://localhost:3000/?error=Configuration"),
    ).toBe(false);
  });
});

describe("authErrorFromSearchParam", () => {
  it("maps AccessDenied to the allowlist message", () => {
    expect(authErrorFromSearchParam("AccessDenied")).toBe(
      AUTH_ERRORS.notAllowed,
    );
  });

  it("maps Verification to an expired-link message", () => {
    expect(authErrorFromSearchParam("Verification")).toBe(
      AUTH_ERRORS.linkExpired,
    );
  });

  it("ignores an empty param", () => {
    expect(authErrorFromSearchParam(undefined)).toBeUndefined();
  });
});
