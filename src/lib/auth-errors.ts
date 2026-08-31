export const AUTH_ERRORS = {
  empty: "Bitte gib deine E-Mail-Adresse ein.",
  notAllowed: "Diese E-Mail-Adresse ist nicht berechtigt.",
  sendFailed:
    "Der Anmeldelink konnte nicht gesendet werden. Bitte versuche es erneut.",
  linkExpired:
    "Dieser Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
} as const;

export function authErrorFromSearchParam(
  error: string | undefined,
): string | undefined {
  if (!error) {
    return undefined;
  }

  switch (error) {
    case "AccessDenied":
      return AUTH_ERRORS.notAllowed;
    case "Verification":
      return AUTH_ERRORS.linkExpired;
    default:
      return AUTH_ERRORS.sendFailed;
  }
}

export function magicLinkSendSucceeded(redirectUrl: string): boolean {
  try {
    const url = new URL(redirectUrl, "http://localhost");
    return !url.searchParams.has("error");
  } catch {
    return false;
  }
}
