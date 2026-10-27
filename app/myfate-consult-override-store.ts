// 生辰报告内容存取:consult_overrides 表按明星存整份报告 JSON,报告页唯一内容来源。
// 统一口径:手写 single-full-v3 九章结构(staticReadingSchema 校验),
// 另可附 heroPillars(四柱干支)/heroBadges(圆形摘要标签)供报告页 Hero 展示。
import { createSupabaseAdminClient } from "./api/auth/server";
import { staticReadingSchema } from "./myfate-static-reading";
import type { StaticReading } from "./myfate-static-reading";

export type ConsultOverrideContent = StaticReading & {
  heroPillars?: string[];
  // Hero 圆形摘要标签,如 ["辛金日主", "身强", "喜用 木 · 水"]
  heroBadges?: string[];
};

// 报告内容可能带 heroPillars/heroBadges 附加键(Hero 展示用),strict schema 校验前先剥离。
export function parseStaticReadingContent(content: unknown) {
  if (!content || typeof content !== "object") return null;
  const { heroPillars: _p, heroBadges: _b, ...core } = content as Record<string, unknown>;
  const parsed = staticReadingSchema.safeParse(core);
  return parsed.success ? parsed.data : null;
}

export async function getConsultOverride(starId: string): Promise<ConsultOverrideContent | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("consult_overrides")
    .select("content")
    .eq("star_id", starId)
    .maybeSingle();
  if (error || !data) return null;
  const content = data.content as ConsultOverrideContent;
  if (!content || typeof content !== "object") return null;
  // 只认统一九章结构;旧六章内容视为未上传(等手写 v3 替换),页面显示"报告准备中"
  return parseStaticReadingContent(content) ? content : null;
}

export async function saveConsultOverride(starId: string, content: ConsultOverrideContent): Promise<void> {
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

// 追问 AI 的上下文摘要:把上传内容压成紧凑文本。
export function formatConsultOverrideDigest(content: ConsultOverrideContent): string {
  const parsed = parseStaticReadingContent(content);
  if (!parsed) return "";
  return Object.values(parsed.sections)
    .map((section) => `【${section.title}】${section.summary} ${section.insights.map((item) => `${item.label}:${item.content}`).join("；")}`)
    .join("\n");
}
