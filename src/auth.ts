import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { db } from "@/db/client";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { isEmailAllowed } from "@/lib/auth";
import { sendVerificationRequest } from "@/lib/send-verification-request";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: { strategy: "jwt" },
  // Forged Host headers must not become magic-link origins. AUTH_URL is the
  // canonical origin in production; do not treat it as a reason to trust Host.
  trustHost: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/",
    error: "/",
    verifyRequest: "/",
  },
  providers: [
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST ?? "127.0.0.1",
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: {
          user: process.env.SMTP_USER ?? "dev",
          pass: process.env.SMTP_PASS ?? "dev",
        },
      },
      from: process.env.SMTP_USER
        ? `Events by Vanessa <${process.env.SMTP_USER}>`
        : "Events by Vanessa <noreply@localhost>",
      sendVerificationRequest,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email && isEmailAllowed(user.email));
    },
    async jwt({ token }) {
      if (token.email && !isEmailAllowed(token.email)) {
        return {};
      }
      return token;
    },
    async session({ session }) {
      if (!session.user?.email || !isEmailAllowed(session.user.email)) {
        return { ...session, user: { ...session.user, email: undefined } };
      }
      return session;
    },
  },
});
