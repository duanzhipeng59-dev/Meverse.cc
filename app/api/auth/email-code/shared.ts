export const CODE_TTL_MS = 10 * 60 * 1000;
export const SEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function generateCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function getSecret() {
  const secret = process.env.EMAIL_CODE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_CODE_SECRET must contain at least 32 characters");
  }
  return secret;
}

export async function hashCode(email: string, code: string) {
  const bytes = new TextEncoder().encode(`${getSecret()}:${email}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function getEmailEnvironment() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL ?? "WildAI <onboarding@resend.dev>",
  };
}

export function apiError(code: string, status: number) {
  return Response.json({ error: code }, { status });
}
