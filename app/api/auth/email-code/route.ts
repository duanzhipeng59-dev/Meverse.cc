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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);

    const admin = createSupabaseAdminClient();
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

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
    const { error } = await resend.emails.send(
      {
        from,
        to: email,
        ...message,
      },
      {
        idempotencyKey: `myfate-login-${generated.data.user.id}-${generated.data.properties.hashed_token}`,
      },
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
