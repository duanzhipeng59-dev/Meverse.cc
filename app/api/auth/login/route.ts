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
      method?: "password" | "code";
    };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_credentials", 401);

    const supabase = createSupabaseClient();
    const result =
      payload.method === "code"
        ? await supabase.auth.verifyOtp({
            email,
            token: payload.code?.trim() ?? "",
            type: "magiclink",
          })
        : await supabase.auth.signInWithPassword({
            email,
            password: payload.password ?? "",
          });

    if (result.error || !result.data.user || !result.data.session) {
      const errorCode =
        payload.method === "code" && result.error
          ? mapOtpError(result.error.message)
          : "invalid_credentials";
      return apiError(errorCode, 401);
    }

    const headers = new Headers({ "content-type": "application/json" });
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
