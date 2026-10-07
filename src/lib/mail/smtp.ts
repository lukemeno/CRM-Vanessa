import { createTransport } from "nodemailer";

export type SmtpMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export async function sendSmtpMail(mail: SmtpMail): Promise<void> {
  if (!smtpConfigured()) {
    throw new Error(
      "SMTP_HOST, SMTP_USER und SMTP_PASS müssen gesetzt sein. Für lokales Arbeiten AUTH_DEV_BYPASS=1 setzen (nur bei NODE_ENV=development wirksam).",
    );
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const result = await transport.sendMail({
    from: `Events by Vanessa <${process.env.SMTP_USER}>`,
    ...mail,
  });

  const failed = [...result.rejected, ...result.pending].filter(Boolean);
  if (failed.length > 0) {
    throw new Error(`E-Mail konnte nicht gesendet werden (${failed.join(", ")})`);
  }
}
