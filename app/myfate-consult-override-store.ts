// 生辰报告精校内容存取:consult_overrides 表按明星存整份报告 JSON,报告页优先读取。
// 结构与 app/myfate-portrait-consult.ts 的 ConsultReport 一致(九章节 JSON)。
import { createSupabaseAdminClient } from "./api/auth/server";
import type { ConsultReport } from "./myfate-portrait-consult";

export async function getConsultOverride(starId: string): Promise<ConsultReport | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("consult_overrides")
    .select("content")
    .eq("star_id", starId)
    .maybeSingle();
  if (error || !data) return null;
  const content = data.content as ConsultReport;
  // 基本结构防线:主章节缺失时视为无效,回退代码/引擎
  for (const key of ["portrait", "pattern", "education", "career", "wealth", "love"] as const) {
    if (!content || typeof content !== "object" || !(key in content)) return null;
  }
  return content;
}

export async function saveConsultOverride(starId: string, content: ConsultReport): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("consult_overrides")
    .upsert({ star_id: starId, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
  if (error) throw error;
}

export async function deleteConsultOverride(starId: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("consult_overrides")
    .delete()
    .eq("star_id", starId);
  if (error) throw error;
}
