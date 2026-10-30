import { Resend } from "resend";
import { createSupabaseAdminClient } from "../server";
import { clientIpFrom, tryAcquireEmailCodeLock } from "./rate-limit";
import {
  apiError,
  buildVerificationEmail,
  CODE_TTL_SECONDS,
  EMAIL_CODE_LENGTH,
  getEmailEnvironment,
  isValidEmail,
  normalizeEmail,
} from "./shared";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);

    // 全局原子抢锁(数据库条件 upsert,跨实例):120 秒内同 邮箱+IP 只有第一个请求能通过。
    // 抢不到说明验证码刚已发出——直接告知剩余秒数,不触发生成与发信,防止第二封覆盖第一封。
    const lock = await tryAcquireEmailCodeLock(email, clientIpFrom(request));
    if (!lock.acquired) {
      return Response.json({ ok: true, alreadySent: true, retryAfter: lock.retryAfter });
    }

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

    if (generated.data.properties.email_otp.length !== EMAIL_CODE_LENGTH) {
      console.error(
        `Supabase email OTP length is ${generated.data.properties.email_otp.length}; expected ${EMAIL_CODE_LENGTH}`,
      );
      return apiError("email_code_length_mismatch", 503);
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

    return Response.json({ ok: true, expiresIn: CODE_TTL_SECONDS, retryAfter: 120 });
  } catch (error) {
    console.error("Email verification request failed", error);
    return apiError("email_service_unavailable", 500);
  }
}
