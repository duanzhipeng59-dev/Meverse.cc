import { createSupabaseClient } from "../server";
import {
  apiError,
  CODE_TTL_SECONDS,
  isValidEmail,
  normalizeEmail,
} from "./shared";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      purpose?: "login" | "register";
    };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);

    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: payload.purpose === "register" },
    });

    if (error) {
      if (error.status === 429) return apiError("code_too_frequent", 429);
      if (/signups? not allowed|user not found/i.test(error.message)) {
        return apiError("invalid_credentials", 401);
      }
      console.error("Supabase failed to send an email code", error.message);
      return apiError("email_send_failed", 502);
    }

    return Response.json({ ok: true, expiresIn: CODE_TTL_SECONDS });
  } catch (error) {
    console.error("Email verification request failed", error);
    return apiError("email_service_unavailable", 500);
  }
}
