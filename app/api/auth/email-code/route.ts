import { Resend } from "resend";
import { createSupabaseAdminClient } from "../server";
import {
  apiError,
  CODE_TTL_SECONDS,
  getEmailEnvironment,
  isValidEmail,
  normalizeEmail,
} from "./shared";

async function findUserByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  let page = 1;

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    const user = result.data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (user) return user;
    if (!result.data.nextPage) return null;
    page = result.data.nextPage;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
      purpose?: "login" | "register";
    };
    const email = normalizeEmail(payload.email ?? "");
    const purpose = payload.purpose === "register" ? "register" : "login";
    if (!isValidEmail(email)) return apiError("invalid_email", 400);
    if (
      purpose === "register" &&
      ((payload.password?.length ?? 0) < 8 ||
        (payload.password?.length ?? 0) > 128)
    ) {
      return apiError("invalid_password", 400);
    }

    const existingUser = await findUserByEmail(email);
    if (purpose === "register" && existingUser) {
      return apiError("email_exists", 409);
    }
    if (purpose === "login" && !existingUser) {
      return apiError("invalid_credentials", 401);
    }

    const admin = createSupabaseAdminClient();
    const generated = await admin.auth.admin.generateLink(
      purpose === "register"
        ? { type: "signup", email, password: payload.password ?? "" }
        : { type: "magiclink", email },
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
    const { error } = await resend.emails.send(
      {
        from,
        to: email,
        subject: "WildAI 邮箱验证码",
        html: `<div style="font-family:Arial,sans-serif;color:#111"><h2>验证你的邮箱</h2><p>你的验证码是：</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${generated.data.properties.email_otp}</p><p>验证码有效期内请勿转发给他人。</p></div>`,
      },
      {
        headers: {
          "Idempotency-Key": `wildai-${purpose}-${generated.data.user.id}-${Date.now()}`,
        },
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
