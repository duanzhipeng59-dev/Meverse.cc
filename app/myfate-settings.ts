import { createSupabaseAdminClient } from "./api/auth/server";
import { createServerCache } from "./server-cache";

// 全站功能开关(app_settings 表,key-value)。
// Supabase 查询带 1.5s 超时;同实例缓存 5 分钟 + 并发去重,避免布局/页面重复查询阻塞渲染。
// 读失败时按最近已知值兜底,没有历史值时按开启兜底,避免故障误伤业务。
const SETTINGS_TTL_MS = 5 * 60_000;
const SETTINGS_TIMEOUT_MS = 1500;

const upgradesCache = createServerCache<boolean>({
  name: "app_settings.upgrades_enabled",
  ttlMs: SETTINGS_TTL_MS,
  timeoutMs: SETTINGS_TIMEOUT_MS,
  load: async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return true;
    const { data, error } = await createSupabaseAdminClient()
      .from("app_settings")
      .select("value")
      .eq("key", "upgrades_enabled")
      .maybeSingle();
    if (error) throw error;
    return data?.value !== "false";
  },
  onError: (_error, stale) => stale ?? true,
});

export async function isUpgradesEnabled(): Promise<boolean> {
  return upgradesCache.get();
}

export async function setUpgradesEnabled(enabled: boolean): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("app_settings")
    .upsert({ key: "upgrades_enabled", value: enabled ? "true" : "false", updated_at: new Date().toISOString() });
  if (error) throw error;
  // 写入成功后同步本地缓存,让同实例请求立即读到新开关。
  upgradesCache.set(enabled);
}
