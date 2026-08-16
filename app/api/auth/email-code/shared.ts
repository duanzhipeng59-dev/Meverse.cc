export const CODE_TTL_SECONDS = 10 * 60;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function apiError(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export function getEmailEnvironment() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL ?? "WildAI <onboarding@resend.dev>",
  };
}
