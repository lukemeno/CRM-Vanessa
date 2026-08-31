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
import { isEmailAllowed } from "@/lib/allowlist";
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
  trustHost: process.env.NODE_ENV !== "production" || Boolean(process.env.AUTH_URL),
  pages: {
    signIn: "/",
    error: "/",
    verifyRequest: "/",
  },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER ?? "smtp://127.0.0.1:1025",
      from:
        process.env.EMAIL_FROM ?? "Events by Vanessa <noreply@localhost>",
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
