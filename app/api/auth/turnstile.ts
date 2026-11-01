// Cloudflare Turnstile 服务端校验:发码接口先过人机验证再触达 Supabase/Resend。
// 未配置 TURNSTILE_SECRET_KEY 时直接放行(配置驱动,同 GA4 的启用模式);
// 校验失败一律拒绝(fail-closed)——CF 不可达时宁可让用户重试,不给机器人留门。
export async function verifyTurnstile(secret: string, token: unknown, remoteIp?: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.warn("Turnstile siteverify unreachable", error);
    return false;
  }
}
