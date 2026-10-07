// 生辰报告内容存取:consult_overrides 表按明星存整份报告 JSON,报告页唯一内容来源。
// 结构与 app/myfate-portrait-consult.ts 的 ConsultReport 一致(九章节 JSON),
// 另可附 heroPillars(四柱干支)供报告页 Hero 与顶栏展示。
import { createSupabaseAdminClient } from "./api/auth/server";
import type { ConsultReport } from "./myfate-portrait-consult";

export type ConsultOverrideContent = ConsultReport & {
  heroPillars?: string[];
  // Hero 圆形摘要标签,如 ["辛金日主", "身强", "喜用 木 · 水"]
  heroBadges?: string[];
};

export async function getConsultOverride(starId: string): Promise<ConsultOverrideContent | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("consult_overrides")
    .select("content")
    .eq("star_id", starId)
    .maybeSingle();
  if (error || !data) return null;
  const content = data.content as ConsultOverrideContent;
  // 基本结构防线:主章节缺失时视为无效,报告页按"未上传"处理
  for (const key of ["portrait", "pattern", "education", "career", "wealth", "love"] as const) {
    if (!content || typeof content !== "object" || !(key in content)) return null;
  }
  return content;
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

// 追问 AI 的上下文摘要:把上传内容压成紧凑文本,替代旧的引擎实时摘要。
export function formatConsultOverrideDigest(content: ConsultOverrideContent): string {
  const line = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join("；");
  const lines: string[] = [];
  const p = content.portrait;
  lines.push(`【人生画像】${line([
    p.strength?.content,
    p.dao?.content,
    p.favorable ? `${p.favorable.label}:${p.favorable.content}` : null,
    p.unfavorable ? `${p.unfavorable.label}:${p.unfavorable.content}` : null,
    ...p.shenSha.map((item) => `${item.label}:${item.content}`),
  ])}`);
  lines.push(`【格局】${line([content.pattern.monthGridRich?.content, ...content.pattern.structures.map((s) => `${s.rel}:${s.text}`)])}`);
  lines.push(`【学业】${line([content.education.degree, content.education.majors.length ? `适合专业:${content.education.majors.join("、")}` : null])}`);
  lines.push(`【事业】${line([content.career.direction, content.career.management, ...content.career.lifetime.map((s) => `${s.age.replace(/^约/, "")}(${s.ganzhi}):${s.note}`)])}`);
  lines.push(`【财富】${line([content.wealth.source, ...content.wealth.lifetime.map((s) => `${s.age.replace(/^约/, "")}(${s.ganzhi})${s.trend}:${s.note}`)])}`);
  lines.push(`【感情】${line([
    ...content.love.spouse.map((item) => `${item.label}:${item.text}`),
    content.love.family,
    content.love.stability,
    ...content.love.lifetime.map((s) => `${s.age.replace(/^约/, "")}(${s.ganzhi})${s.tag}:${s.note}`),
  ])}`);
  return lines.join("\n");
}
