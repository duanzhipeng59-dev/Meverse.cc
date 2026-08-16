import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "../../../../db";
import { emailVerificationCodes } from "../../../../db/schema";
import {
  apiError,
  CODE_TTL_MS,
  generateCode,
  getEmailEnvironment,
  hashCode,
  isValidEmail,
  normalizeEmail,
  SEND_COOLDOWN_MS,
} from "./shared";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_email", 400);

    const db = await getDb();
    const [latest] = await db
      .select({ createdAt: emailVerificationCodes.createdAt })
      .from(emailVerificationCodes)
      .where(eq(emailVerificationCodes.email, email))
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1);
    const now = Date.now();
    if (latest && now - latest.createdAt < SEND_COOLDOWN_MS) {
      return apiError("code_too_frequent", 429);
    }

    const code = generateCode();
    const id = crypto.randomUUID();
    await db.insert(emailVerificationCodes).values({
      id,
      email,
      codeHash: await hashCode(email, code),
      expiresAt: now + CODE_TTL_MS,
      createdAt: now,
    });

    const { apiKey, from } = getEmailEnvironment();
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(
      {
        from,
        to: email,
        subject: "WildAI 邮箱验证码",
        html: `<div style="font-family:Arial,sans-serif;color:#111"><h2>验证你的邮箱</h2><p>你的验证码是：</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效，请勿转发给他人。</p></div>`,
      },
      { headers: { "Idempotency-Key": `email-code-${id}` } },
    );
    if (error) {
      await db
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.id, id));
      console.error("Resend failed to send verification code", error);
      return apiError("email_send_failed", 502);
    }

    return Response.json({ ok: true, expiresIn: CODE_TTL_MS / 1000 });
  } catch (error) {
    console.error("Email verification request failed", error);
    return apiError("email_service_unavailable", 500);
  }
}
