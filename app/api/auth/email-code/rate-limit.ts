import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "../server";

// 邮箱验证码发送的全局原子锁(Supabase 表 + 条件 upsert,见迁移 20261030160000):
// 120 秒内同一 邮箱+IP 只有第一个请求能抢到,跨部署实例全局生效;
// 抢不到直接告知"已发送+剩余秒数",不再触发出码与发信,防止验证码被第二次请求覆盖。
// 锁服务本身故障时放行(可用性优先),仅记录日志。
export async function tryAcquireEmailCodeLock(email: string, ip: string): Promise<{ acquired: boolean; retryAfter: number }> {
  const lockKey = createHash("sha256").update(`${email}|${ip}`).digest("hex");
  const { data, error } = await createSupabaseAdminClient().rpc("try_acquire_email_code_lock", {
    p_lock_key: lockKey,
    p_cooldown_seconds: 120,
  });
  if (error) {
    console.error("Email code lock unavailable", error.message);
    return { acquired: true, retryAfter: 0 };
  }
  const retryAfter = typeof data === "number" ? data : 0;
  return { acquired: retryAfter <= 0, retryAfter: Math.max(retryAfter, 1) };
}

export function clientIpFrom(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "").trim() || "unknown";
}
