import { afterEach, describe, expect, it, vi } from "vitest";
import { sendVerificationRequest } from "@/lib/send-verification-request";

describe("sendVerificationRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not send mail when the address is not allowlisted", async () => {
    vi.stubEnv("AUTH_ALLOWLIST", "vanessa@events-altehettnerfabrik.de");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendVerificationRequest({
      identifier: "fremd@example.com",
      url: "http://localhost:3000/api/auth/callback/nodemailer?token=secret",
      provider: { server: "smtp://should-not-be-used", from: "x@y.z" },
    });

    expect(warn).toHaveBeenCalled();
  });

  it("prints the magic link in development bypass mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DEV_BYPASS", "1");
    vi.stubEnv("AUTH_ALLOWLIST", "luke@example.com");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendVerificationRequest({
      identifier: "luke@example.com",
      url: "http://localhost:3000/magic",
      provider: { server: "smtp://should-not-be-used", from: "x@y.z" },
    });

    expect(info.mock.calls.join(" ")).toContain("http://localhost:3000/magic");
  });
});
