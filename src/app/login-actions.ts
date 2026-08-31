"use server";

import { signIn } from "@/auth";
import { AUTH_ERRORS } from "@/lib/auth-errors";
import { evaluateMagicLinkRequest } from "@/lib/magic-link-request";

export type LoginState = {
  error?: string;
  sent?: boolean;
};

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const decision = evaluateMagicLinkRequest(String(formData.get("email") ?? ""));
  if (!decision.ok) {
    return { error: decision.error };
  }

  try {
    await signIn("nodemailer", {
      email: decision.email,
      redirect: false,
      redirectTo: "/heute",
    });
    return { sent: true };
  } catch {
    return { error: AUTH_ERRORS.sendFailed };
  }
}
