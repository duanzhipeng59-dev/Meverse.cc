import { Resend } from "resend";
import { createSupabaseAdminClient } from "../server";
import {
  apiError,
  buildVerificationEmail,
  CODE_TTL_SECONDS,
  getEmailEnvironment,
  isValidEmail,
  normalizeEmail,
} from "./shared";

const UPSTREAM_TIMEOUT_MS = 6_000;

async function withUpstreamTimeout<T>(promise: Promise<T>, operation: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${operation}_TIMEOUT`)),
          UPSTREAM_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);

    const admin = createSupabaseAdminClient();
    const generated = await withUpstreamTimeout(
      admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      }),
      "SUPABASE_GENERATE_LINK",
    );

    if (generated.error || !generated.data.properties?.email_otp) {
      if (generated.error?.status === 429) {
        return apiError("code_too_frequent", 429);
      }
      console.error(
        "Supabase failed to generate an email code",
        generated.error?.message,
      );
      return apiError("email_service_unavailable", 500);
    }

    const { apiKey, from } = getEmailEnvironment();
    const resend = new Resend(apiKey);
    const message = buildVerificationEmail(generated.data.properties.email_otp);
    const { error } = await withUpstreamTimeout(
      resend.emails.send(
        {
          from,
          to: email,
          ...message,
        },
        {
          idempotencyKey: `wildgpt-login-${generated.data.user.id}-${generated.data.properties.hashed_token}`,
        },
      ),
      "RESEND_SEND_EMAIL",
    );

    if (error) {
      console.error("Resend failed to send verification code", error);
      return apiError("email_send_failed", 502);
    }

    return Response.json({ ok: true, expiresIn: CODE_TTL_SECONDS });
  } catch (error) {
    console.error("Email verification request failed", error);
    return apiError("email_service_unavailable", 500);
  }
}
