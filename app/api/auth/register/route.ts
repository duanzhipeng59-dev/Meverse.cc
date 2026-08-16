import { apiError, isValidEmail, normalizeEmail } from "../email-code/shared";
import {
  appendSessionCookies,
  createSupabaseClient,
  mapOtpError,
} from "../server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
      code?: string;
    };
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password ?? "";
    const code = payload.code?.trim() ?? "";
    if (!isValidEmail(email)) return apiError("invalid_email", 400);
    if (password.length < 8 || password.length > 128) {
      return apiError("invalid_password", 400);
    }
    if (!/^\d{6}$/.test(code)) return apiError("invalid_code", 400);

    const supabase = createSupabaseClient();
    const verified = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (verified.error || !verified.data.user || !verified.data.session) {
      return apiError(
        verified.error ? mapOtpError(verified.error.message) : "invalid_code",
        400,
      );
    }

    const updated = await supabase.auth.updateUser({ password });
    if (updated.error) {
      console.error("Supabase failed to set the registered password", updated.error.message);
      return apiError("auth_unavailable", 500);
    }

    const headers = new Headers({ "content-type": "application/json" });
    appendSessionCookies(headers, verified.data.session, request);
    return new Response(
      JSON.stringify({
        user: { id: verified.data.user.id, email: verified.data.user.email },
      }),
      { status: 201, headers },
    );
  } catch (error) {
    console.error("Registration failed", error);
    return apiError("auth_unavailable", 500);
  }
}
