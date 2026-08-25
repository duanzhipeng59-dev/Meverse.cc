export const CODE_TTL_SECONDS = 10 * 60;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function apiError(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export function getEmailEnvironment() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL ?? "Myfate <onboarding@resend.dev>",
  };
}

export function buildVerificationEmail(code: string) {
  return {
    subject: "Myfate 邮箱登录验证码",
    text: `你正在登录 Myfate。验证码是 ${code}，10 分钟内有效。请勿将验证码转发给他人。如非你本人操作，请忽略此邮件。`,
    html: `<div style="margin:0;background:#f6f7f9;padding:32px 16px;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#111827"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:36px"><div style="font-size:24px;font-weight:800;letter-spacing:-0.5px">Myfate</div><h1 style="margin:32px 0 8px;font-size:24px;line-height:1.35">邮箱验证</h1><p style="margin:0;color:#6b7280;font-size:15px;line-height:1.8">你正在登录 Myfate，请输入下方验证码：</p><div style="margin:28px 0;padding:20px 16px;border-radius:14px;background:#f3f6ff;color:#172554;text-align:center;font-size:36px;font-weight:800;letter-spacing:10px">${code}</div><p style="margin:0;color:#4b5563;font-size:14px;line-height:1.8">验证码在 <strong>10 分钟</strong>内有效，且只能使用一次。</p><p style="margin:24px 0 0;padding-top:22px;border-top:1px solid #eef0f3;color:#9ca3af;font-size:13px;line-height:1.7">请勿将验证码转发给他人。如非你本人操作，可直接忽略此邮件。</p></div></div>`,
  };
}
