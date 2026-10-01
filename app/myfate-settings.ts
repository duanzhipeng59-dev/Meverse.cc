import { createSupabaseAdminClient } from "./api/auth/server";

// 全站功能开关(app_settings 表,key-value)。读失败时按开启兜底,避免故障误伤业务。
export async function isUpgradesEnabled(): Promise<boolean> {
  try {
    const { data } = await createSupabaseAdminClient()
      .from("app_settings")
      .select("value")
      .eq("key", "upgrades_enabled")
      .maybeSingle();
    return data?.value !== "false";
  } catch {
    return true;
  }
}

export async function setUpgradesEnabled(enabled: boolean): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("app_settings")
    .upsert({ key: "upgrades_enabled", value: enabled ? "true" : "false", updated_at: new Date().toISOString() });
  if (error) throw error;
}
