import { describe, expect, it } from "vitest";
import { isDevBypassEnabled } from "@/lib/dev-bypass";

describe("isDevBypassEnabled", () => {
  it("is true only in development when AUTH_DEV_BYPASS=1", () => {
    expect(
      isDevBypassEnabled({
        NODE_ENV: "development",
        AUTH_DEV_BYPASS: "1",
      }),
    ).toBe(true);
  });

  it("is false in production even if AUTH_DEV_BYPASS=1", () => {
    expect(
      isDevBypassEnabled({
        NODE_ENV: "production",
        AUTH_DEV_BYPASS: "1",
      }),
    ).toBe(false);
  });

  it("is false in development when the flag is not 1", () => {
    expect(
      isDevBypassEnabled({
        NODE_ENV: "development",
        AUTH_DEV_BYPASS: "true",
      }),
    ).toBe(false);
  });
});
