import { afterEach, describe, expect, it, vi } from "vitest";
import { smtpConfigured } from "@/lib/mail/smtp";

describe("smtpConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when Ionos SMTP env vars are missing", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    expect(smtpConfigured()).toBe(false);
  });

  it("is true when host, user, and password are set", () => {
    vi.stubEnv("SMTP_HOST", "smtp.ionos.de");
    vi.stubEnv("SMTP_USER", "vanessa@events-altehettnerfabrik.de");
    vi.stubEnv("SMTP_PASS", "secret");
    expect(smtpConfigured()).toBe(true);
  });
});
