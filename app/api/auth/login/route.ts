import { apiError, emailLogId, EMAIL_CODE_LENGTH, isValidEmail, normalizeEmail } from "../email-code/shared";
import {
  appendSessionCookies,
  createSupabaseClient,
  mapOtpError,
} from "../server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      code?: string;
    };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);
    const emailId = emailLogId(email);
    const code = payload.code?.trim() ?? "";
    if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`, "u").test(code)) {
      return apiError("invalid_code", 400);
    }

    const supabase = createSupabaseClient();
    const result = await supabase.auth.verifyOtp({
      email,
      token: code,
      // `email_otp` is an email OTP even though it is produced by the
      // passwordless/magic-link generator. Supabase requires email OTPs to
      // be verified with the `email` type; `magiclink` is for the link flow.
      type: "email",
    });

    if (result.error || !result.data.user || !result.data.session) {
      console.warn("Email OTP verification failed", {
        emailId,
        status: result.error?.status ?? null,
        code: result.error?.code ?? null,
        reason: result.error?.message ?? "missing_user_or_session",
      });
      const errorCode = result.error
        ? mapOtpError(result.error.message)
        : "invalid_code";
      return apiError(errorCode, 401);
    }

    const headers = new Headers({ "content-type": "application/json" });
    console.info("Email OTP verified", { emailId });
    appendSessionCookies(headers, result.data.session, request);
    return new Response(
      JSON.stringify({
        user: { id: result.data.user.id, email: result.data.user.email },
      }),
      { headers },
    );
  } catch (error) {
    console.error("Login failed", error);
    return apiError("auth_unavailable", 500);
  }
}
