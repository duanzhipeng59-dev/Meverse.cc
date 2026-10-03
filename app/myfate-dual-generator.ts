// 双星合盘报告生成:结构引擎事实 → AI 翻译为八大章节;失败可重试,内容持久化到 dual_star_reports。
import { z } from "zod";
import { createSupabaseAdminClient } from "./api/auth/server";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildDualChart, buildDualStructure, type DualStructure } from "./myfate-dual-engine";
import { getCelebrityVedicBirth, getPublishedStar } from "./myfate-stars-server";
import type { CelebrityVedicBirth } from "./myfate-stars-server";

const sectionSchema = z.object({
  title: z.string().min(2).max(20),
  paragraphs: z.array(z.string().min(10).max(400)).min(2).max(5),
});

export const dualReportSchema = z.object({
  keywords: z.array(z.string().min(2).max(6)).min(2).max(4),
  summary: z.string().min(15).max(120),
  scores: z.object({
    overall: z.number().min(0).max(100),
    attraction: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    emotion: z.number().min(0).max(100),
    cooperation: z.number().min(0).max(100),
    conflict: z.number().min(0).max(100),
    longevity: z.number().min(0).max(100),
  }),
  sections: z.object({
    attraction: sectionSchema,
    emotion: sectionSchema,
    dynamics: sectionSchema,
    career: sectionSchema,
    conflict: sectionSchema,
    longterm: sectionSchema,
  }),
  basis: z.array(z.object({ term: z.string().min(2).max(40), plain: z.string().min(8).max(160) })).min(4).max(8),
});

export type DualReportContent = z.infer<typeof dualReportSchema>;

const SYSTEM_PROMPT = `你是资深命理文化编辑,为一份「双明星合盘」报告撰写章节文案。铁律:
1. 只使用输入中给出的命理结构事实,不得编造任何盘面数据、出生信息或关系事件。
2. 两位明星是公众人物,报告只解读命理模型中的互动倾向,绝不暗示他们现实中存在恋爱、合作或私人关系;禁止"一定相爱/注定结婚/已经恋爱/必然分手"等断言,使用"倾向/可能/容易/更适合/需要留意"等表达。
3. 分数只表示报告内部的相对关系趋势,不表达现实关系结论。
4. 语言:简体中文,克制、具体、有画面感,不用"命盘显示你们"等对用户说话的口吻(这是两位明星之间的解读)。
5. 严格输出 JSON,不要任何 JSON 以外的文字。`;

function buildPrompt(s: DualStructure) {
  const facts = [
    `明星A:${s.starA.name},日主${s.starA.dayMaster}(${s.starA.dayElement}),命局${s.starA.strength},格局:${s.starA.pattern},喜用:${s.starA.favorable.join("、")},四柱:${s.starA.pillars.join(" ")}`,
    `明星B:${s.starB.name},日主${s.starB.dayMaster}(${s.starB.dayElement}),命局${s.starB.strength},格局:${s.starB.pattern},喜用:${s.starB.favorable.join("、")},四柱:${s.starB.pillars.join(" ")}`,
    `日主关系:${s.dayMasterRelation}`,
    `天干互动:${s.ganCombinations.length ? s.ganCombinations.join(";") : "两人天干无明显五合"}`,
    `地支互动:${s.branchInteractions.length ? s.branchInteractions.map((x) => `A ${x.aPos}${x.aZhi}与B ${x.bPos}${x.bZhi}${x.type}`).join(";") : "两人四支柱支无明显合冲害"}`,
    `关系宫:${s.spousePalace}`,
    `五行互补:${s.elementBalance}`,
    `结构参考分(相对趋势):吸引${s.basisScores.attraction} 沟通${s.basisScores.communication} 情绪${s.basisScores.emotion} 合作${s.basisScores.cooperation} 冲突${s.basisScores.conflict} 长期${s.basisScores.longevity}`,
  ].join("\n");

  return `${facts}

请输出如下 JSON(全部为简体中文):
{
  "keywords": [2-4个关系关键词,每个2-6字],
  "summary": "一句话关系画像,30-80字,概括两人的互动基调",
  "scores": { "overall": 0-100, "attraction": 0-100, "communication": 0-100, "emotion": 0-100, "cooperation": 0-100, "conflict": 0-100, "longevity": 0-100 },
  "sections": {
    "attraction": { "title": "相互吸引", "paragraphs": ["两人容易被对方哪部分吸引、初期互动与化学反应、吸引中的落差,2-4段,每段60-150字"] },
    "emotion": { "title": "情绪与沟通", "paragraphs": ["表达方式差异、谁更主动、谁更需要空间、易理解与易误解处、更适合的沟通方式,2-4段"] },
    "dynamics": { "title": "关系动力", "paragraphs": ["谁更推动关系、谁掌握节奏、依赖或竞争倾向、边界与相互影响,2-4段,不得使用谁控制谁谁克谁等绝对表达"] },
    "career": { "title": "合作与事业", "paragraphs": ["是否适合共同工作、舞台与创作协作、能力互补、决策与权责、合作冲突点,2-4段"] },
    "conflict": { "title": "矛盾与成长课题", "paragraphs": ["最易摩擦的位置、典型冲突表现、各自防御方式、需要学习的课题、更合适的处理方法,2-4段"] },
    "longterm": { "title": "长期关系倾向", "paragraphs": ["关系持续的动力、靠近或疏远的原因、长期维持的条件、变化期的典型表现;不预测现实婚姻恋爱结果,2-4段"] }
  },
  "basis": [ { "term": "命理术语(如:日主甲木生丁火)", "plain": "这句话的白话解释,20-80字" } ]
}
basis 至少 5 条,必须来自上面给出的结构事实。`;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("NO_JSON");
  return text.slice(start, end + 1);
}

async function generateContent(s: DualStructure): Promise<DualReportContent> {
  const prompt = buildPrompt(s);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const generation = await generateChatText(SYSTEM_PROMPT, [{ role: "user", content: prompt }], { temperature: 0.7 });
    try {
      return dualReportSchema.parse(JSON.parse(extractJson(generation.content)));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("DUAL_GENERATE_INVALID");
}

export async function runDualGeneration(reportId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: report, error: fetchError } = await supabase.from("dual_star_reports").select("id, user_id, star_a, star_b").eq("id", reportId).maybeSingle();
  if (fetchError || !report) return;
  try {
    const [publishedA, publishedB] = await Promise.all([getPublishedStar(report.star_a), getPublishedStar(report.star_b)]);
    if (!publishedA || !publishedB) throw new Error("STAR_NOT_FOUND");
    const [birthAResult, birthBResult] = await Promise.all([getCelebrityVedicBirth(report.star_a), getCelebrityVedicBirth(report.star_b)]);
    const birthA = birthAResult ?? toFallbackBirth(publishedA.id, publishedA.name, publishedA.birthDate);
    const birthB = birthBResult ?? toFallbackBirth(publishedB.id, publishedB.name, publishedB.birthDate);
    const dualA = buildDualChart(birthA);
    const dualB = buildDualChart(birthB);
    const structure = buildDualStructure(birthA, birthB, dualA.chart, dualB.chart, dualA.profile, dualB.profile);
    const content = await generateContent(structure);
    const { error: updateError } = await supabase.from("dual_star_reports").update({
      status: "ready",
      keywords: content.keywords,
      summary: content.summary,
      content: content as unknown as Record<string, unknown>,
      error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", reportId);
    if (updateError) throw updateError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DUAL_GENERATE_FAILED";
    console.error("Dual report generation failed", reportId, message);
    await supabase.from("dual_star_reports").update({
      status: "failed",
      error: message.slice(0, 200),
      updated_at: new Date().toISOString(),
    }).eq("id", reportId);
    // 生成失败自动退回额度
    const { error: refundError } = await supabase.rpc("refund_report_credit", { p_user_id: report.user_id, p_reason: "dual:" + reportId });
    if (refundError) console.error("Dual refund failed", reportId, refundError.message);
  }
}

function toFallbackBirth(id: string, name: string, birthDate: string): CelebrityVedicBirth {
  return { starId: id, name, birthDate, birthTime: "", birthPlace: "首尔", lat: 37.57, lon: 126.98, tz: "Asia/Seoul", gender: "unknown", cachedChartMd: null, cachedChartSummary: null };
}
