import { afterEach, describe, expect, it, vi } from "vitest";

const sendSmtpMail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mail/smtp", () => ({
  sendSmtpMail,
}));

describe("sendVerificationRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("does not send mail when the address is not allowlisted", async () => {
    vi.stubEnv("AUTH_ALLOWLIST", "vanessa@events-altehettnerfabrik.de");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendVerificationRequest } = await import(
      "@/lib/send-verification-request"
    );

    await sendVerificationRequest({
      identifier: "fremd@example.com",
      url: "http://localhost:3000/api/auth/callback/nodemailer?token=secret",
      provider: { server: "smtp://should-not-be-used", from: "x@y.z" },
    });

    expect(sendSmtpMail).not.toHaveBeenCalled();
  });

  it("prints the magic link in development bypass mode and does not send mail", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DEV_BYPASS", "1");
    vi.stubEnv("AUTH_ALLOWLIST", "luke@example.com");
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendVerificationRequest } = await import(
      "@/lib/send-verification-request"
    );

    await sendVerificationRequest({
      identifier: "luke@example.com",
      url: "http://localhost:3000/magic",
      provider: { server: "smtp://should-not-be-used", from: "x@y.z" },
    });

    expect(sendSmtpMail).not.toHaveBeenCalled();
  });
});
