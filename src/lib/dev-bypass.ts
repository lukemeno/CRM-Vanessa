/**
 * Console magic-link delivery. Never true unless NODE_ENV is development.
 */
export function isDevBypassEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV === "development" && env.AUTH_DEV_BYPASS === "1";
}
