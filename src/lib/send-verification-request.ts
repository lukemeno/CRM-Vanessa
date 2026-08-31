import { createTransport } from "nodemailer";
import { isEmailAllowed } from "@/lib/allowlist";
import { isDevBypassEnabled } from "@/lib/dev-bypass";

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
  provider,
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

  if (!process.env.EMAIL_SERVER || !provider.server) {
    throw new Error(
      "EMAIL_SERVER ist nicht gesetzt. Für lokales Arbeiten AUTH_DEV_BYPASS=1 setzen (nur bei NODE_ENV=development wirksam).",
    );
  }

  const transport = createTransport(provider.server);
  const result = await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject: "Dein Anmeldelink für Events by Vanessa",
    text: textBody(url),
    html: htmlBody(url),
  });

  const failed = [...result.rejected, ...result.pending].filter(Boolean);
  if (failed.length > 0) {
    throw new Error(`E-Mail konnte nicht gesendet werden (${failed.join(", ")})`);
  }
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
          <a href="${url}" style="background:#5c6540;color:#fffdf8;text-decoration:none;padding:12px 22px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:15px;">
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
