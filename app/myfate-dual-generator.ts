// 双星合盘报告生成:结构引擎事实 → AI 翻译为章节文案。
// 评分只由引擎在创建时算出并落库,AI 不得改分;失败退款按消费流水幂等执行。
import { z } from "zod";
import { createSupabaseAdminClient } from "./api/auth/server";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildDualChart, buildDualStructure, type DualStructure } from "./myfate-dual-engine";
import { getCelebrityVedicBirth } from "./myfate-stars-server";

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
    timeline: sectionSchema,
  }),
  basis: z.array(z.object({ term: z.string().min(2).max(40), plain: z.string().min(8).max(160), confidence: z.enum(["strong", "medium", "light"]).default("medium") })).min(4).max(10),
});

export type DualReportContent = z.infer<typeof dualReportSchema>;

const SYSTEM_PROMPT = `你是资深命理文化编辑,为一份「双星命理合盘」报告撰写章节文案。铁律:
1. 只使用输入中给出的命理结构事实,不得编造盘面数据、出生信息或关系事件;不得提及分数数字(评分由系统另置)。
2. 两位明星是公众人物,报告只解读命理模型中的互动倾向,绝不暗示现实恋爱、合作或私人关系;禁止"一定相爱/注定结婚/已经恋爱/必然分手"等断言,使用"倾向/可能/容易/更适合/需要留意"表达。
3. 每个章节必须引用输入中对应的具体结构(合冲刑害、十神、五行、柱位),空泛句子会被拒稿。
4. 语言:简体中文,克制、具体、有画面感;描述两位明星之间的互动,不对用户说话。
5. 严格输出 JSON,不要任何 JSON 以外的文字。`;

const SECTION_SPECS: Array<{ key: keyof DualReportContent["sections"]; title: string; hint: string }> = [
  { key: "attraction", title: "核心吸引来源", hint: "两人容易被对方哪部分吸引、初期化学反应、吸引中的落差" },
  { key: "communication", title: "情绪与沟通方式", hint: "表达差异、谁更主动、谁更需要空间、易误解处与更适合的沟通方式" },
  { key: "intimacy", title: "亲密关系模式", hint: "亲近时的相处质地、依赖与独立、亲密需求是否匹配" },
  { key: "conflict", title: "冲突触发点", hint: "最容易摩擦的位置、典型表现、各自防御方式、更合适的处理方法" },
  { key: "career", title: "事业与资源协作", hint: "是否适合共同工作、能力互补、决策与权责、合作冲突点" },
  { key: "longterm", title: "长期关系潜力", hint: "关系持续的动力、靠近或疏远的原因、长期维持条件;不预测现实结果" },
  { key: "timeline", title: "未来关系时间线", hint: "结合给出的流年窗口,描述未来三年关系节奏的可能变化(只描述趋势窗口)" },
];

function POS(index: number) {
  return ["年柱", "月柱", "日柱", "时柱"][index];
}

function buildPrompt(s: DualStructure) {
  const facts = [
    `明星A:${s.starA.name},日主${s.starA.dayMaster}(${s.starA.dayElement}),${s.starA.strength},格局:${s.starA.pattern},喜用:${s.starA.favorable.join("、")},忌:${s.starA.cautious.join("、")},四柱:${s.starA.pillars.join(" ")}`,
    `明星B:${s.starB.name},日主${s.starB.dayMaster}(${s.starB.dayElement}),${s.starB.strength},格局:${s.starB.pattern},喜用:${s.starB.favorable.join("、")},忌:${s.starB.cautious.join("、")},四柱:${s.starB.pillars.join(" ")}`,
    `双向影响:${s.dayMasterBidirectional.aToB};${s.dayMasterBidirectional.bToA}`,
    `天干互动:${s.ganCombinations.length ? s.ganCombinations.join(";") : "两人天干无明显五合"}`,
    `地支互动:${s.branchInteractions.length ? s.branchInteractions.map((x) => `A ${POS(x.aPos)}${x.aZhi} × B ${POS(x.bPos)}${x.bZhi} ${x.type}——${x.meaning}`).join(";") : "两人四支柱支无明显合冲害破"}`,
    `合局刑局:${s.combinations.length ? s.combinations.map((c) => `${c.type}(${c.branches.join("")})——${c.meaning}`).join(";") : "无跨盘合局刑局"}`,
    `关系宫:${s.spousePalace.text}`,
    `五行互济:${s.elementBalance.text}`,
    `强弱:${s.strengthNote}`,
    `藏干互动(择要):${s.hiddenGods.slice(0, 8).map((h) => `${h.side} ${h.pos} 藏干${h.hidden}(${h.god})`).join(";")}`,
    `流年窗口:${s.luckWindow.map((w) => `${w.year} ${w.ganzhi}:${w.event}`).join(";") || "未来三年无强窗口信号"}`,
  ].join("\n");
  const sections = SECTION_SPECS.map(({ key, title, hint }) => `"${key}": { "headline": "一句话结论(8-40字)", "basis": ["引用结构事实的依据,1-3条"], "aToB": "A 对 B 的影响(结合十神方向)", "bToA": "B 对 A 的影响", "behavior": "现实中可能出现的相处表现", "risk": "容易发生的问题", "advice": "如何相处更顺畅(可执行)" } /* ${title}: ${hint} */`).join(",\n    ");
  return `${facts}

输出 JSON:
{
  "keywords": [2-4个关系关键词,每个2-6字],
  "summary": "一句话关系画像,30-90字",
  "sections": {
    ${sections}
  },
  "basis": [ { "term": "命理术语", "plain": "白话解释20-80字", "confidence": "strong|medium|light(按输入事实强度)" } ]
}
basis 至少 5 条,必须来自上面给出的结构事实,confidence 与事实强度一致。`;
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
  const { data: report, error: fetchError } = await supabase
    .from("dual_star_reports")
    .select("id, user_id, star_a, star_b, charge_ledger_id")
    .eq("id", reportId)
    .maybeSingle();
  if (fetchError || !report) return;
  try {
    const [birthA, birthB] = await Promise.all([getCelebrityVedicBirth(report.star_a), getCelebrityVedicBirth(report.star_b)]);
    if (!birthA || !birthB) throw new Error("BIRTH_DATA_MISSING");
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
    // 幂等退款:按创建时绑定的消费流水,同一笔只会退一次;免费模式无流水不退
    const ledgerId = report.charge_ledger_id as number | null;
    if (ledgerId !== null) {
      const { error: refundError } = await supabase.rpc("refund_dual_charge", { p_ledger_id: ledgerId });
      if (refundError) console.error("Dual refund failed", reportId, refundError.message);
    }
  }
}
