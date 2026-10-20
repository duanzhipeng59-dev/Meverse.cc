// Single-person phase-one report: the model explains an engine-owned static chart only.
// No dayun, annual forecast, score, event prediction or model-derived chart fact is accepted.
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

const sectionKeys = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "family"] as const;
const evidenceId = z.string().regex(/^(chart|structure|tenGod|relation|area)\.[a-zA-Z0-9_-]+$/u);
const insightSchema = z.object({
  label: z.string().min(2).max(16),
  content: z.string().min(20).max(260),
  evidenceIds: z.array(evidenceId).min(1).max(4).optional(),
}).strict();
const sectionSchema = z.object({
  title: z.string().min(2).max(20),
  summary: z.string().min(30).max(360),
  evidenceIds: z.array(evidenceId).min(1).max(5).optional(),
  insights: z.array(insightSchema).min(2).max(5),
  advice: z.array(z.string().min(8).max(100)).min(1).max(3),
}).strict();

// v2 起不再要求 AI 回传 evidence 目录与 evidenceIds 引用(页面不展示依据);
// v1 存量报告仍可解析(evidence 字段可选)。
export const staticReadingSchema = z.object({
  schemaVersion: z.enum(["single-static-v1", "single-static-v2"]),
  scope: z.literal("static-chart-only"),
  sections: z.object(Object.fromEntries(sectionKeys.map((key) => [key, sectionSchema])) as Record<(typeof sectionKeys)[number], typeof sectionSchema>).strict(),
  evidence: z.array(z.object({ id: evidenceId, fact: z.string().min(2), source: z.literal("bazi-engine") }).strict()).min(8).optional(),
  disclaimer: z.string().min(20),
}).strict();

export type StaticReading = z.infer<typeof staticReadingSchema>;
export type StaticReadingFacts = ReturnType<typeof buildStaticReadingFacts>;

const inferenceLevel = z.enum(["fact", "strong_inference", "weak_inference"]);
const plannedClaimSchema = z.object({
  claim: z.string().min(6).max(100),
  evidenceIds: z.array(evidenceId).min(1).max(6),
  inferenceLevel,
  // 下限放宽到 4:长度是质量线不是红线,AI 偶发短句不应整份拒收
  structure: z.string().min(4).max(160),
  plainMeaning: z.string().min(4).max(160),
  scenario: z.string().min(4).max(160),
  strengthSide: z.string().min(4).max(160),
  riskSide: z.string().min(4).max(160),
  action: z.string().min(4).max(100),
}).strict();

export const staticReadingPlanSchema = z.object({
  scope: z.literal("static-chart-only"),
  sections: z.object(Object.fromEntries(sectionKeys.map((key) => [key, z.array(plannedClaimSchema).min(2).max(4)])) as Record<(typeof sectionKeys)[number], z.ZodArray<typeof plannedClaimSchema>>).strict(),
}).strict();
export type StaticReadingPlan = z.infer<typeof staticReadingPlanSchema>;

export const STATIC_READING_SYSTEM_PROMPT = `你是 MeVerse 单人八字静态命局解读作者。输入是排盘引擎已经确定的事实，你只负责解释，不负责计算。

最高优先级规则：
1. 只使用 facts.evidence 中的事实。不得自行计算、修正或补充四柱、十神、旺衰、格局、喜忌、神煞、刑冲合害。
2. 本阶段只分析原局。禁止提及大运、流年、具体年份、年龄窗口、概率、分数、财富金额、疾病、寿命、子女性别或“必然发生”的事件。
3. 严格按照已经通过校验的论证计划写作，不得新增结论。每条解读依次呈现：结构关系、白话含义、现实场景、优势面、过度使用的代价、可执行建议。
4. 关系相合不等于合化；输入没有的神煞不得出现。健康章节只能谈生活方式与精力管理，不得诊断。
5. 用“更倾向、可能、适合关注”等非确定表达；这是传统文化自我观察，不是科学预测。
6. 输出必须是单个 JSON 对象，不要 Markdown。字段必须严格匹配指定结构。
7. 不得用穿戴颜色、方位、饰品、法器或所谓“化解”作为建议；建议必须是现实中可观察、可执行的行为。
8. 每个风险判断必须同时写出适用条件、缓冲因素或可控制动作，不制造恐惧；不得伪造用户经历、反馈或现实身份。

八个解读章节固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、family。每章结构：title、summary、insights、advice。顶层固定 schemaVersion="single-static-v2"、scope="static-chart-only"、sections、disclaimer。不要输出 evidence 字段。`;

export const STATIC_READING_PLAN_SYSTEM_PROMPT = `你是 MeVerse 单人八字静态命局的论证规划器。你不写最终报告，只把确定性引擎事实组织成可校验的论证计划。

规则：
1. 只能引用输入 evidence 的 id，不得计算或补充任何命理事实。
2. 每个 claim 必须完成“结构关系 → 白话含义 → 现实场景 → 优势面 → 风险面 → 行动”的完整链条。
3. inferenceLevel 只能是 fact、strong_inference、weak_inference。strong_inference 至少需要两个独立 evidence id；单一信号只能标为 weak_inference，且不得作为确定结论。
4. 禁止大运、流年、年份、年龄、概率、分数、金额、疾病、寿命、子女性别、配偶外貌/职业、学历层级、管理人数和必然事件。
5. action 必须是可观察行为；禁止颜色、方位、穿戴、饰品、法器、风水物或“化解”。
6. 风险面必须有缓冲条件或可控制动作，不得恐吓。
7. 输出单个 JSON 对象，不要 Markdown。结构固定为 {"scope":"static-chart-only","sections":{八个固定章节 key:[每章2-4条 claim]}}。`;

function entry(id: string, fact: string) {
  return { id, fact, source: "bazi-engine" as const };
}

export function buildStaticReadingFacts(chart: BaziChart, profile: BaziLifeProfile) {
  const evidence = [
    ...chart.pillars.map((pillar, index) => entry(`chart.pillar-${index + 1}`, `${pillar.label}${pillar.ganzhi}，天干十神${pillar.shiShenGan}，藏干${pillar.hideGan.join("、")}，藏干十神${pillar.hideShiShen.join("、")}`)),
    entry("chart.day-master", `日主${chart.dayMaster}，日主五行${profile.summary.dayElement}`),
    entry("chart.elements", `原局五行计数：${Object.entries(chart.wuXing).map(([key, value]) => `${key}${value}`).join("、")}`),
    entry("structure.summary", `旺衰${profile.summary.strength}；格局摘要${profile.summary.pattern}；月令${profile.summary.season}`),
    entry("structure.favorable", `引擎喜用：${profile.summary.favorable.join("、")}`),
    entry("structure.cautious", `引擎提示节制：${profile.summary.cautious.join("、")}`),
    ...profile.tenGods.map((god, index) => entry(`tenGod.${index + 1}`, `${god.name}权重${god.value}，层级${god.level}，关键词${god.keywords.join("、")}`)),
    ...profile.relations.map((relation, index) => entry(`relation.${index + 1}`, `${relation.title}：${relation.text}`)),
    ...sectionKeys.flatMap((key) => {
      const areaKey = key === "portrait" || key === "pattern" ? "personality" : key === "education" ? "talent" : key === "relationship" ? "relationship" : key === "wellbeing" ? "wellbeing" : key;
      const area = profile.areas[areaKey as keyof typeof profile.areas];
      const staticDetails = area.details.filter((detail) => !/(大运|流年|具体年份)/u.test(detail));
      return [entry(`area.${key}`, `${area.summary} ${staticDetails.join(" ")}`)];
    }),
  ];
  return {
    scope: "static-chart-only" as const,
    exclusions: ["dayun", "annual", "forecast", "scores", "wealth-amount", "medical-diagnosis", "child-gender"],
    evidence,
  };
}

export function buildStaticReadingPlanPrompt(facts: StaticReadingFacts) {
  const sample = facts.evidence[0]?.id ?? "chart.pillar-1";
  const sample2 = facts.evidence[1]?.id ?? sample;
  const sampleClaim = {
    claim: "论断一句话(12-100字)",
    evidenceIds: [sample, sample2],
    inferenceLevel: "fact|strong_inference|weak_inference 三选一(标 strong_inference 时 evidenceIds 必须含至少 2 个不同 id)",
    structure: "结构关系(10-160字)",
    plainMeaning: "白话含义(10-160字)",
    scenario: "现实场景(10-160字)",
    strengthSide: "优势面(10-160字)",
    riskSide: "风险面与缓冲条件(10-160字)",
    action: "可观察可执行的行为建议(8-100字)",
  };
  const template = {
    scope: "static-chart-only",
    sections: Object.fromEntries(sectionKeys.map((key) => [key, [sampleClaim, sampleClaim]])),
  };
  return `请依据下面的确定性事实生成论证计划。

输出必须是单个 JSON 对象,严格匹配下面的模板结构(sections 是以八个章节 key 为字段的对象,每个字段的值是 claim 数组、每章 2-4 条;不要输出模板之外的任何字段):

${JSON.stringify(template, null, 1)}

输入事实(唯一事实来源,evidenceIds 只能引用其中真实存在的 id):

${JSON.stringify({ facts }, null, 2)}`;
}

export function buildStaticReadingPrompt(facts: StaticReadingFacts, plan: StaticReadingPlan) {
  // 精确输出模板:sections 必须是以章节 key 为字段的对象(不是数组)
  const template = {
    schemaVersion: "single-static-v2",
    scope: "static-chart-only",
    sections: Object.fromEntries(sectionKeys.map((key) => [key, {
      title: "章节标题(2-20字)",
      summary: "本章总结(30-360字)",
      insights: [{ label: "小标题(2-16字)", content: "命理解读(20-260字)" }],  // 每条 insight 只有 label 与 content 两个字段;计划 claim 的 action 写入章节级 advice
      advice: ["可执行建议(8-100字)"],
    }])),
    disclaimer: "免责声明(20字以上):本报告基于传统命理文化的自我观察参考,不构成科学预测或决策依据。",
  };
  return `依据以下已校验论证计划生成八章静态命局解读。不得新增、删除或改变计划中的核心结论。

输出必须是单个 JSON 对象,严格匹配下面的模板结构(字段名、类型、嵌套完全一致;sections 是以八个章节 key 为字段的对象,不是数组;insights 每章 2-5 条;advice 每章 1-3 条;不要输出模板之外的任何字段):

${JSON.stringify(template, null, 1)}

已校验论证计划:

${JSON.stringify(plan, null, 2)}

输入事实(只用于理解计划,不得越过计划新增结论):

${JSON.stringify({ facts }, null, 2)}`;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("STATIC_READING_NO_JSON");
  return text.slice(start, end + 1);
}

// 宽容剥离:计划的 claim 带 action,AI 常顺手把 advice/action 塞进报告 insight;
// 按白名单只保留 label/content/evidenceIds(多余字段内容弃用),避免 strict 校验整体拒收。
function sanitizeReportDraft(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const draft = raw as { sections?: Record<string, unknown> };
  if (!draft.sections || typeof draft.sections !== "object") return raw;
  for (const section of Object.values(draft.sections)) {
    const sec = section as { insights?: unknown };
    if (!Array.isArray(sec?.insights)) continue;
    sec.insights = sec.insights.map((item) => {
      if (!item || typeof item !== "object") return item;
      const { label, content, evidenceIds } = item as Record<string, unknown>;
      const clean: Record<string, unknown> = { label, content };
      if (Array.isArray(evidenceIds)) clean.evidenceIds = evidenceIds;
      return clean;
    });
  }
  return raw;
}

const forbidden = /(大运|流年|\b20\d{2}年|\d+岁|概率|\d+%|[万亿]元|癌症|诊断|寿命|男孩|女孩|子女性别|注定|一定会)/u;
const unsupportedSpecificity = /(配偶|另一半).{0,12}(长相|身高|职业|行业|属相)|学历.{0,8}(本科|硕士|博士)|管理.{0,8}\d+人/u;
const superstitiousAction = /(穿|佩戴|摆放|朝向|方位|颜色|饰品|法器|符咒|改运|化解)/u;

export function validateStaticReadingPlan(raw: unknown, facts: StaticReadingFacts): StaticReadingPlan {
  const plan = staticReadingPlanSchema.parse(raw);
  const validIds = new Set(facts.evidence.map((item) => item.id));
  for (const key of sectionKeys) {
    for (const claim of plan.sections[key]) {
      if (claim.evidenceIds.some((id) => !validIds.has(id))) throw new Error("STATIC_READING_PLAN_UNKNOWN_EVIDENCE");
      if (claim.inferenceLevel === "strong_inference" && new Set(claim.evidenceIds).size < 2) throw new Error("STATIC_READING_PLAN_WEAK_SUPPORT");
      const text = Object.values(claim).filter((value) => typeof value === "string").join(" ");
      if (forbidden.test(text) || unsupportedSpecificity.test(text)) throw new Error("STATIC_READING_PLAN_UNSUPPORTED_CLAIM");
      if (superstitiousAction.test(claim.action)) throw new Error("STATIC_READING_PLAN_ACTION_FORBIDDEN");
    }
  }
  return plan;
}

export function validateStaticReading(raw: unknown): StaticReading {
  const report = staticReadingSchema.parse(raw);
  const prose = sectionKeys.map((key) => JSON.stringify(report.sections[key])).join("\n");
  const hit = forbidden.exec(prose);
  // 拦截错误带上触发词,供重试时反馈给模型精准移除
  if (hit) throw new Error(`STATIC_READING_PREDICTION_FORBIDDEN:${hit[0]}`);
  if (unsupportedSpecificity.test(prose)) throw new Error("STATIC_READING_UNSUPPORTED_SPECIFICITY");
  for (const key of sectionKeys) {
    if (report.sections[key].advice.some((item) => superstitiousAction.test(item))) throw new Error("STATIC_READING_ACTION_FORBIDDEN");
  }
  return report;
}

// 把校验失败原因转成给模型的纠错提示(zod 错误取首个字段路径)
function describeValidationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("STATIC_READING_PREDICTION_FORBIDDEN:")) return `正文包含预测性禁词「${message.split(":")[1]}」，必须删除或改写`;
  if (message === "STATIC_READING_PLAN_WEAK_SUPPORT") return "strong_inference 的 claim 只引用了 1 个证据——必须补足第 2 个独立 evidence id,或降级为 weak_inference/fact";
  if (message === "STATIC_READING_PLAN_UNKNOWN_EVIDENCE") return "引用了输入中不存在的 evidence id";
  if (message === "STATIC_READING_PLAN_UNSUPPORTED_CLAIM") return "claim 包含禁用内容(年份/金额/配偶画像/学历层级等预测性表述)";
  if (message === "STATIC_READING_PLAN_ACTION_FORBIDDEN") return "action 含颜色/方位/饰品/法器等迷信化表述";
  const issueMatch = /"path":\s*\[\s*"([^"]+)"/.exec(message);
  return issueMatch ? `字段 ${issueMatch[1]} 结构不符合模板` : message.slice(0, 100);
}

export async function generateStaticReading(callModel: (system: string, prompt: string) => Promise<string>, facts: StaticReadingFacts) {
  let planError: unknown;
  let plan: StaticReadingPlan | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const suffix = attempt ? `\n\n上次计划未通过校验：${describeValidationError(planError)}。请修正证据引用、推断强度和禁用内容后，重新输出完整 JSON。` : "";
      const text = await callModel(STATIC_READING_PLAN_SYSTEM_PROMPT, buildStaticReadingPlanPrompt(facts) + suffix);
      plan = validateStaticReadingPlan(JSON.parse(extractJson(text)), facts);
      break;
    } catch (error) {
      planError = error;
    }
  }
  if (!plan) throw planError instanceof Error ? planError : new Error("STATIC_READING_PLAN_INVALID");

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = attempt
      ? `\n\n上次输出未通过校验：${describeValidationError(lastError)}。请重新输出完整 JSON：sections 保持以八个章节 key 为字段的对象结构，全文不得出现「大运、流年、具体年份、岁数、概率、百分比、金额、疾病诊断、子女性别、注定、一定会」等预测性表述。`
      : "";
    try {
      const text = await callModel(STATIC_READING_SYSTEM_PROMPT, buildStaticReadingPrompt(facts, plan) + suffix);
      return validateStaticReading(sanitizeReportDraft(JSON.parse(extractJson(text))));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("STATIC_READING_INVALID");
}

export function isStaticReading(value: unknown): value is StaticReading {
  return staticReadingSchema.safeParse(value).success;
}
