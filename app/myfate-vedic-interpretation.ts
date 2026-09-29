import { z } from "zod";
import { generateReportText } from "./api/myfate/personalize/model-provider";
import type { VedicServiceSynastry } from "./myfate-vedic-client";
import { vedicRelationshipTypes, type VedicChartSummary, type VedicDimension, type VedicRelationshipType } from "./myfate-vedic-types";

const dimensionLabels = ["情绪安全", "吸引与亲密", "沟通修复", "长期承载", "现实协作", "当前时机"] as const;

const aiInterpretationSchema = z.object({
  headline: z.string().min(4),
  insight: z.string().min(10),
  tension: z.string().min(4),
  relationshipType: z.enum(vedicRelationshipTypes),
  relationshipSummary: z.string().min(10),
  dimensions: z.array(z.object({
    label: z.enum(dimensionLabels),
    tier: z.string().min(1),
    supportingEvidence: z.string().min(4),
    limitingEvidence: z.string().min(4),
    directionGap: z.string().min(2),
    confidence: z.enum(["high", "medium", "low"]),
    realityCheck: z.string().min(4),
  })).length(6),
  timingNotes: z.array(z.string()).min(1),
});

export type VedicInterpretation = z.infer<typeof aiInterpretationSchema>;

// Models sometimes return dimensions as a label-keyed object instead of an
// array, or omit optional-looking string fields; reshape before validating.
function normalizeAiOutput(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw;
  const value = { ...(raw as Record<string, unknown>) };
  if (value.dimensions && !Array.isArray(value.dimensions) && typeof value.dimensions === "object") {
    value.dimensions = Object.entries(value.dimensions as Record<string, unknown>).map(([label, entry]) => ({
      ...(typeof entry === "object" && entry !== null ? entry : {}),
      label,
    }));
  }
  if (!Array.isArray(value.timingNotes)) {
    value.timingNotes = typeof value.timingNotes === "string" && value.timingNotes.trim()
      ? [value.timingNotes]
      : synastryDefaultTiming();
  }
  if (typeof value.relationshipSummary !== "string" && typeof value.headline === "string") {
    value.relationshipSummary = value.headline;
  }
  return value;
}

function synastryDefaultTiming() {
  return ["当前双方 Dasha 序列未显示强共振窗口"];
}

function overlayLines(items: Array<{ planet: string; sign: string; house_in_dst: number; dignity: string }>) {
  return items.map((r) => `${r.planet}(${r.sign})→第${r.house_in_dst}宫 [${r.dignity}]`).join("; ");
}

function buildPrompt(userChart: VedicChartSummary, starChart: VedicChartSummary, synastry: VedicServiceSynastry, starName: string) {
  const s = synastry.sections;
  const koota = s.ashtakoota.map((r) => `${r.item}:${r.tier}(${r.dim})`).join("; ");
  return [
    `A = 用户, B = ${starName}(明星,仅作角色扮演式分析对象)`,
    `A盘: Lagna ${userChart.lagna} / ${userChart.lagnaNakshatra}, Moon ${userChart.moonSign} / ${userChart.moonNakshatra} pada${userChart.moonPada}, Sun ${userChart.sunSign}, Venus ${userChart.venusSign}, Mars ${userChart.marsSign}`,
    `B盘: Lagna ${starChart.lagna} / ${starChart.lagnaNakshatra}, Moon ${starChart.moonSign} / ${starChart.moonNakshatra} pada${starChart.moonPada}, Sun ${starChart.sunSign}, Venus ${starChart.venusSign}, Mars ${starChart.marsSign}`,
    `Ashtakoota(仅筛查不裁决): ${koota}`,
    `A行星落B宫: ${overlayLines(s.overlayAToB)}`,
    `B行星落A宫: ${overlayLines(s.overlayBToA)}`,
    `跨盘相位: ${s.crossAspects.map((r) => `${r.a}-${r.b} ${r.kind}(${r.orb})`).join("; ")}`,
    `同宫共鸣: ${s.sameHouseResonance.map((r) => `${r.planet}→第${r.house}宫`).join("; ") || "无"}`,
    `A视相命中B点位: ${s.drishtiAToB.map((r) => `${r.a}→${r.point}(${r.nature})`).join("; ") || "无"}`,
    `B视相命中A点位: ${s.drishtiBToA.map((r) => `${r.a}→${r.point}(${r.nature})`).join("; ") || "无"}`,
    `关键点位: A→B ${s.keyPointsAToB.map((r) => `${r.point}→第${r.house_in_b}宫`).join(", ")}; B→A ${s.keyPointsBToA.map((r) => `${r.point}→第${r.house_in_b}宫`).join(", ")}`,
    `Dasha时机: ${s.dashaLines.join(" | ")}; 线索: ${s.dashaNotes.join(" | ") || "无"}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `你是吠陀占星(Jyotish)双人合盘解读师,基于 Parashara 体系。你会收到一份"只存计算不存解释"的跨盘数据(synastry_data)。你的任务是把计算数据翻译成中文的六维关系矩阵报告。

规则:
1. 只引用给定的计算数据,禁止自己重算或编造行星位置。
2. 不给单一匹配百分比,每个维度用固定档位:情绪安全(支持/混合/高压)、吸引与亲密(温和/强烈/不对称/黏着风险)、沟通修复(顺畅/可训练/易升级)、长期承载(有资源/条件式/承载不足)、现实协作(互补/竞争/责任失衡)、当前时机(同步/错位/暂不宜升级)。
3. 每维必含:支持证据、制约证据(引用具体行星/宫位)、方向差异、置信度(high/medium/low)、现实验证点(给用户一个可观察的行为验证)。
4. relationshipType 只能是七类之一:高吸引高承载/高吸引低承载/低戏剧高承载/成长催化型/现实协作型/节奏错位型/高消耗修复不足。
5. 中文白话为主(约70%),技术引用简洁;headline 一句话抓核心,insight 讲连接质量,tension 讲主要摩擦与修复资源。
6. Ashtakoota 仅作月宿筛查层,dosha 不一票否决。
输出严格的 JSON 对象,不要 markdown 代码块。结构必须完全一致:
{"headline":str,"insight":str,"tension":str,"relationshipType":str(七类之一),"relationshipSummary":str,"timingNotes":[str],
"dimensions":[恰好6项,{"label":str(情绪安全|吸引与亲密|沟通修复|长期承载|现实协作|当前时机),"tier":str,"supportingEvidence":str,"limitingEvidence":str,"directionGap":str,"confidence":"high"|"medium"|"low","realityCheck":str}]}
dimensions 必须是数组(不是对象),字段名必须用上面的英文键名。`;

export async function interpretVedicSynastry(
  userChart: VedicChartSummary,
  starChart: VedicChartSummary,
  synastry: VedicServiceSynastry,
  starName: string,
): Promise<{ interpretation: VedicInterpretation; source: "deepseek" | "template" }> {
  const prompt = buildPrompt(userChart, starChart, synastry, starName);
  try {
    const generation = await generateReportText(SYSTEM_PROMPT, prompt, { json: true, temperature: 0.6, maxTokens: 4000 });
    const cleaned = generation.content.replace(/^```(?:json)?\n?/u, "").replace(/\n?```$/u, "");
    const parsed = aiInterpretationSchema.safeParse(normalizeAiOutput(JSON.parse(cleaned)));
    if (parsed.success) return { interpretation: parsed.data, source: "deepseek" };
    console.error("Vedic AI interpretation schema mismatch", parsed.error.issues.slice(0, 3));
  } catch (error) {
    console.error("Vedic AI interpretation failed", error);
  }
  return { interpretation: templateInterpretation(userChart, starChart, synastry, starName), source: "template" };
}

function templateInterpretation(
  userChart: VedicChartSummary,
  starChart: VedicChartSummary,
  synastry: VedicServiceSynastry,
  starName: string,
): VedicInterpretation {
  const s = synastry.sections;
  const resonance = s.sameHouseResonance.length;
  const hardAspects = s.crossAspects.filter((r) => r.kind.includes("opposition") || r.kind.includes("square")).length;
  const relationshipType: VedicRelationshipType = resonance >= 3
    ? "低戏剧高承载"
    : hardAspects >= 6
      ? "成长催化型"
      : "现实协作型";
  const tier = (value: string) => value;
  const dimension = (label: VedicDimension["label"], defaultTier: string, support: string, limit: string): VedicDimension => ({
    label,
    tier: tier(defaultTier),
    supportingEvidence: support,
    limitingEvidence: limit,
    directionGap: "双方节奏与优先级存在自然差异,需要显式对齐",
    confidence: "medium" as const,
    realityCheck: "观察一次共同决策(如安排一次出行)时双方的实际配合方式",
  });
  return {
    headline: `你的 ${userChart.lagna} 上升与 ${starName} 的 ${starChart.lagna} 上升形成 ${resonance > 0 ? "多宫位共鸣" : "互补结构"}的连接`,
    insight: `你的月亮在 ${userChart.moonSign}(${userChart.moonNakshatra}),TA 的月亮在 ${starChart.moonSign}(${starChart.moonNakshatra})。跨盘数据显示 ${resonance} 组同宫共鸣、${s.crossAspects.length} 组跨盘相位,情绪与需求的表达既有呼应也有错位。`,
    tension: hardAspects >= 4
      ? "跨盘对分/四分较多,摩擦点集中在节奏与安全感上,需要明确的修复机制"
      : "主要张力来自节奏差异而非根本冲突,通过约定沟通时机可以缓解",
    relationshipType,
    relationshipSummary: `基于双方星盘的跨盘结构,这段连接更接近"${relationshipType}"的关系形态。`,
    dimensions: [
      dimension("情绪安全", "混合", `月亮跨盘相位与 ${userChart.moonNakshatra}/${starChart.moonNakshatra} 月宿筛查`, "情绪表达节奏不同"),
      dimension("吸引与亲密", "温和", `金星 ${userChart.venusSign} 与 ${starChart.venusSign} 的互动 + 5/7 宫激活`, "吸引力分布不完全对称"),
      dimension("沟通修复", "可训练", "水星相关落宫与视相数据", "升级风险存在于压力情境"),
      dimension("长期承载", "条件式", `土星 ${userChart.saturnSign ?? ""} 与结构宫位互动`, "长期承诺需要现实条件支撑"),
      dimension("现实协作", "互补", "双方宫主星交叉落宫", "责任分工需要明确"),
      dimension("当前时机", "同步", s.dashaLines.join(";") || "当前 Dasha 窗口平稳", s.dashaNotes.join(";") || "时机线索有限,置信度较低"),
    ],
    timingNotes: s.dashaLines.length ? s.dashaLines : ["当前双方 Dasha 序列未显示强共振窗口"],
  };
}
