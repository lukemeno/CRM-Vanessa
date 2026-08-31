"use server";

import { signIn } from "@/auth";
import { AUTH_ERRORS, magicLinkSendSucceeded } from "@/lib/auth-errors";
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
    const redirectUrl = await signIn("nodemailer", {
      email: decision.email,
      redirect: false,
      redirectTo: "/heute",
    });

    if (
      typeof redirectUrl !== "string" ||
      !magicLinkSendSucceeded(redirectUrl)
    ) {
      return { error: AUTH_ERRORS.sendFailed };
    }

    return { sent: true };
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: AUTH_ERRORS.sendFailed };
  }
}
