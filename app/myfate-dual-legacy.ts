// 旧版双人合盘报告 schema:早期自填双人报告(及已下线的双星合盘)落库的结构化格式。
// 双星合盘功能已下线,本文件只服务于 reading_reports 历史双人报告的兼容渲染与追问摘要;
// 现行双人报告走 myfate-bazi-dual-report 的 Gemini 结构化输出,不再使用本 schema。
import { z } from "zod";

const rhythmPeriodSchema = z.object({
  start_year: z.number().int().min(1900).max(2200),
  end_year: z.number().int().min(1900).max(2200),
  label: z.string().min(4).max(16),
  detail: z.string().min(15).max(140),
});

const futureRhythmSchema = z.object({
  supportive_periods: z.array(rhythmPeriodSchema).max(3),
  pressure_periods: z.array(rhythmPeriodSchema).max(3),
});

const sectionSchema = z.object({
  headline: z.string().min(8).max(60),
  basis: z.array(z.string().min(6).max(120)).min(1).max(4),
  aToB: z.string().min(10).max(200),
  bToA: z.string().min(10).max(200),
  behavior: z.string().min(10).max(200),
  risk: z.string().min(10).max(200),
  advice: z.string().min(10).max(160),
});

export const dualReportSchema = z.object({
  keywords: z.array(z.string().min(2).max(6)).min(2).max(4),
  summary: z.string().min(15).max(140),
  sections: z.object({
    attraction: sectionSchema,
    communication: sectionSchema,
    intimacy: sectionSchema,
    conflict: sectionSchema,
    career: sectionSchema,
    longterm: sectionSchema,
    // 旧版报告的时间线章节,仅作历史数据兼容读取
    timeline: sectionSchema.optional(),
  }),
  future_rhythm: futureRhythmSchema.optional(),
  available_time_range: z.object({ start_year: z.number().int(), end_year: z.number().int() }).nullable().optional(),
  basis: z.array(z.object({ term: z.string().min(2).max(40), plain: z.string().min(8).max(160), confidence: z.enum(["strong", "medium", "light"]).default("medium") })).min(4).max(10),
});

export type DualReportContent = z.infer<typeof dualReportSchema>;

// 双人报告文案归一:把 AI 残留的 A/B 代称替换为两人姓名(独立字母,不误伤英文名)
export function withPersonNames(text: string, nameA: string, nameB: string): string {
  return text.replace(/(?<![A-Za-z])A(?![A-Za-z])/g, nameA).replace(/(?<![A-Za-z])B(?![A-Za-z])/g, nameB);
}
