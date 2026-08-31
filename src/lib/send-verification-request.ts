import { isEmailAllowed } from "@/lib/auth";
import { isDevBypassEnabled } from "@/lib/dev-bypass";
import { sendSmtpMail } from "@/lib/mail/smtp";

type VerificationParams = {
  identifier: string;
  url: string;
  provider: {
    server?: string | object;
    from?: string;
  };
};

export async function sendVerificationRequest({
  identifier,
  url,
}: VerificationParams) {
  if (!isEmailAllowed(identifier)) {
    console.warn(
      `[auth] Magic-Link für nicht erlaubte Adresse unterdrückt: ${identifier}`,
    );
    return;
  }

  if (isDevBypassEnabled()) {
    console.info(`[auth] Dev-Bypass: Magic-Link für ${identifier}\n${url}`);
    return;
  }

  await sendSmtpMail({
    to: identifier,
    subject: "Dein Anmeldelink für Events by Vanessa",
    text: textBody(url),
    html: htmlBody(url),
  });
}

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function textBody(url: string) {
  return [
    "Events by Vanessa",
    "",
    "Hier ist dein Anmeldelink für die Betriebs-App:",
    url,
    "",
    "Wenn du diese Mail nicht angefordert hast, kannst du sie ignorieren.",
  ].join("\n");
}

function htmlBody(url: string) {
  return `
<body style="background:#f4efe4;margin:0;padding:24px;font-family:Georgia,serif;color:#3d3a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fffdf8;border-radius:12px;padding:32px;">
    <tr>
      <td>
        <p style="letter-spacing:0.28em;text-transform:uppercase;color:#5c6540;font-size:13px;margin:0 0 8px;">Events</p>
        <p style="font-style:italic;color:#5c6540;margin:0 0 24px;">by Vanessa</p>
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;">
          Hier ist dein Anmeldelink für die Betriebs-App.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${escapeHtmlAttr(url)}" style="background:#5c6540;color:#fffdf8;text-decoration:none;padding:12px 22px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:15px;">
            Jetzt anmelden
          </a>
        </p>
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#6d6a5c;">
          Wenn du diese Mail nicht angefordert hast, kannst du sie ignorieren.
        </p>
      </td>
    </tr>
  </table>
</body>`;
}
