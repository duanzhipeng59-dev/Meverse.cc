// 邮箱验证码发送冷却:实例内内存实现(Vercel 多实例下为近似限流,叠加 Supabase 自身 429)。
const COOLDOWN_MS = 60_000;
const MAX_KEYS = 5_000;

const nextAllowed = new Map<string, number>();

export function emailCodeRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (nextAllowed.size > MAX_KEYS) {
    for (const [k, ts] of nextAllowed) {
      if (ts <= now) nextAllowed.delete(k);
    }
    if (nextAllowed.size > MAX_KEYS) nextAllowed.clear();
  }
  const blockedUntil = nextAllowed.get(key);
  if (blockedUntil !== undefined && blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000) };
  }
  nextAllowed.set(key, now + COOLDOWN_MS);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIpFrom(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "").trim() || "unknown";
}
