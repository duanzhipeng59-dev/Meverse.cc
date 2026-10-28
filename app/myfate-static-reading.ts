// Single-person deep reading: the engine owns chart facts and chronology; the model
// only turns those verified facts into prose. Evidence and timelines are merged from
// engine output after model validation, so the model cannot invent either contract.
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

const sectionKeys = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "children", "family"] as const;
const evidenceId = z.string().regex(/^(chart|structure|tenGod|relation|area)\.[a-zA-Z0-9_-]+$/u);
const insightSchema = z.object({
  label: z.string(),
  content: z.string(),
  evidenceIds: z.array(evidenceId).min(1).max(4).optional(),
}).strict();
const sectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  evidenceIds: z.array(evidenceId).min(1).max(5).optional(),
  insights: z.array(insightSchema),
  advice: z.array(z.string()),
}).strict();

const rhythmItemSchema = z.object({
  ganzhi: z.string().length(2),
  age: z.string().min(2),
  years: z.string().min(4),
  label: z.enum(["明显顺势", "温和向好", "平稳蓄力", "波动调整", "谨慎收缩"]),
  score: z.number().int().min(30).max(98).optional(),
  theme: z.string().min(8),
  opportunity: z.string().min(8),
  watch: z.string().min(8),
  action: z.string().min(8),
  current: z.boolean(),
}).strict();
const annualRhythmItemSchema = rhythmItemSchema.omit({ age: true, years: true, current: true }).extend({ year: z.number().int() }).strict();
const domainTimelineSchema = z.object({
  dayun: z.array(rhythmItemSchema),
  annual: z.array(annualRhythmItemSchema),
}).strict();

export const staticReadingSchema = z.object({
  schemaVersion: z.enum(["single-static-v1", "single-static-v2", "single-full-v3"]),
  scope: z.enum(["static-chart-only", "full-reading"]),
  sections: z.object(Object.fromEntries(sectionKeys.map((key) => [key, key === "children" ? sectionSchema.optional() : sectionSchema])) as Record<(typeof sectionKeys)[number], typeof sectionSchema>).strict(),
  evidence: z.array(z.object({ id: evidenceId, fact: z.string().min(2), source: z.literal("bazi-engine") }).strict()).min(8).optional(),
  timelines: z.object({ career: domainTimelineSchema, wealth: domainTimelineSchema, relationship: domainTimelineSchema }).strict().optional(),
  disclaimer: z.string(),
}).strict();

export type StaticReading = z.infer<typeof staticReadingSchema>;
export type StaticReadingFacts = ReturnType<typeof buildStaticReadingFacts>;

export const STATIC_READING_SYSTEM_PROMPT = `你是 MeVerse 的资深命理师与现代人物观察者。排盘引擎负责事实，你只负责在事实边界内写作《MeVerse 个人八字报告 V1.0（蒸馏模板版）》。

写作规则：
1. 每个字段先给命理师式结论，再写具体盘面依据，最后翻译成现代人物画像或可执行建议；判断必须能回指输入中的 evidenceId。
2. 传统术语与白话并用。格局写成“结构名＋解读”，不能只报术语，也不能脱离盘面写泛泛人格描述。
3. 严格保持九章、固定小节与顺序；每字段按内容需要自然展开，不强制统一字数，不为凑长度重复。
4. 事业、财富、感情的“一生”与“近期”字段，必须逐项覆盖引擎给出的每一步大运和每一个流年；只解释输入中已有的干支、年龄、年份、分数和交接信息。
5. 不得自行计算或补造旺衰、格局、喜忌、神煞、刑冲合害、大运、流年、分数或事件。输入没有的事实就明确说资料未提供，不作判断。
6. 不得给出确定性的财富金额、学历、疾病、寿命、婚期、离婚、生育数量或子女性别预言；健康只写生活方式提醒并建议必要时咨询专业人士，财务与关系只写倾向和决策提示。
7. 输出必须是单个 JSON 对象，不要 Markdown，不要模板外字段。`;

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
    entry("area.children", `时柱${chart.pillars[3].ganzhi}对应子女与晚辈，藏干十神为${chart.pillars[3].hideShiShen.join("、")}；食伤权重${profile.tenGods.find((item) => item.name === "食伤")?.value ?? 0}。`),
    ...sectionKeys.flatMap((key) => {
      if (key === "children") return [];
      const areaKey = key === "portrait" || key === "pattern" ? "personality" : key === "education" ? "talent" : key === "relationship" ? "relationship" : key === "wellbeing" ? "wellbeing" : key;
      const area = profile.areas[areaKey as keyof typeof profile.areas];
      return [entry(`area.${key}`, `${area.summary} ${area.details.join(" ")}`)];
    }),
  ];
  return {
    scope: "static-chart-only" as const,
    exclusions: [] as string[],
    evidence,
  };
}

const REPORT_SECTION_SPECS = [
  ["portrait", "人生画像", ["旺衰定性", "道法与喜忌", "喜神/忌神/闲神", "神煞底色"]],
  ["pattern", "格局", ["月令格局", "命盘结构特征", "结构清浊"]],
  ["education", "学业", ["学历与学习方式", "适合专业", "学习节奏节点"]],
  ["career", "事业", ["职业方向", "管理与领导力", "贵人/小人/与上级", "一生事业轨迹", "近期流年事业"]],
  ["wealth", "财富", ["财富能力画像", "主要获财方式", "一生财富大运", "近期流年财富"]],
  ["relationship", "感情", ["伴侣互动画像", "对方家庭/配偶父母", "婚姻稳定性", "一生婚恋大运", "近期感情流年"]],
  ["wellbeing", "身心", ["身体照护重点", "急性风险防护", "心理健康倾向"]],
  ["children", "子女", ["子女缘分", "养育议题", "子女发展/亲子关系"]],
  ["family", "六亲", ["父亲", "母亲", "兄弟姐妹/同辈"]],
] as const;

const PARAGRAPH_TEMPLATE = `【精细段落模板】每一条 insight.content 都是完整自然段，不写提纲、关键词堆砌或“可能是/也许是”的空泛套话。按以下四句骨架写作，可根据事实多少自然合并或展开：
① 断语：先用命理师口吻给出本小节最重要的判断，第一句直接回答“这一项对当事人的核心含义是什么”。
② 盘据：紧接着引用 1~3 个真实 evidenceId 对应的四柱、十神、五行、关系或引擎摘要，说明“为什么这样判断”；没有证据就写“当前排盘未提供该项依据”，不得补算。
③ 画像：把术语翻译成现代人物在工作、学习、关系或决策中的可观察表现，避免把抽象术语重复一遍。
④ 建议：以一到两句给出可执行的取舍、边界或练习；健康、财务、关系只写风险意识和行动选项，不写确定结果。
每个 insight 只能围绕一个小节主题；summary 是本章总起（先总判断，再点出本章依据与主线）；advice 是本章行动清单（短句、具体、可执行，不重复 insight 原文）。insight.evidenceIds 只能从输入 evidence.id 中选择，至少引用一个真实 ID 时才输出该字段。

【分类型段落写法】
• 旺衰/格局/结构：先下“结构名＋解读”断语，再按天干、地支、藏干或引擎摘要解释生克流通，最后写成优势与制约并存的现实画像；不能自行创设格局名或成格率。
• 学业/事业/财富/感情的静态字段：先写底层倾向，再写对应十神或区域事实，最后给适合的环境、协作方式和边界；不把倾向改写成学历、收入、婚姻结果。
• 大运段落：严格按“XX大运｜年龄段｜年份区间”起句，随后写阶段结论、输入中的依据、该阶段的机会/约束、一个行动重点；不得遗漏或新增大运。
• 流年段落：严格按“YYYY年（干支）｜引擎分数｜所属大运”起句，随后写当年主题、已给 basis 的解释、可把握处、需留意处和行动；分数原样引用，不自行调整，不写区间外年份。
• 关系段落：写互动机制、沟通触发点、边界与协商方式；没有配偶外貌、职业、家庭或婚期证据时，明确资料不足，不用五行套模板补齐。
• 身心段落：只写传统文化视角下的自我照护倾向和减压方式；不得写医学诊断、疾病预测、寿命或高危年份，必要时建议咨询专业人士。
`;

const TEMPLATE_SECTIONS = `【报告模板 V1.0】九章顺序固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、children、family。根级 5 个字段，加九章各 4 个固定容器（title、summary、insights、advice），合计 41 个结构字段；不得增删或换序。insights 的 label 必须逐字使用下列小节名并保持顺序，content 按“结论→具体盘面依据→现代画像/建议”自然展开，不强制统一字数：

${PARAGRAPH_TEMPLATE}

01 portrait 人生画像：旺衰定性；道法与喜忌；喜神/忌神/闲神；神煞底色。只复述引擎已经给出的旺衰、格局摘要与喜忌；神煞没有引擎证据时明确“不作判断”。
02 pattern 格局：月令格局；命盘结构特征；结构清浊。格局必须写“结构名＋解读”，结构名只能采用引擎格局摘要，不能自行成格。
03 education 学业：学历与学习方式（只写学习偏好与认知方式，不预测学历上限）；适合专业（给出 2~3 类方向并说明依据）；学习节奏节点（按已给流年写准备策略，不承诺考试结果）。
04 career 事业：职业方向；管理与领导力；贵人/小人/与上级；一生事业轨迹；近期流年事业。后两项按引擎列表逐运、逐年分析，分数原样引用，只写阶段倾向与行动建议。
05 wealth 财富：财富能力画像（写资源观、风险偏好与现金流习惯，不给金额或阶层结论）；主要获财方式；一生财富大运；近期流年财富。逐运逐年只写机会、风险与行动，不写确定性收益。
06 relationship 感情：伴侣互动画像（只写互动需求与择偶偏好，不推断长相、职业或经济条件）；对方家庭/配偶父母（无直接证据时明确资料不足）；婚姻稳定性；一生婚恋大运；近期感情流年。不得写缘分概率、确定婚期或离婚结论。
07 wellbeing 身心：身体照护重点；急性风险防护；心理健康倾向。内容只能作为生活方式提醒，不把五行映射写成医学诊断或高危年份。
08 children 子女：子女缘分；养育议题；子女发展/亲子关系。不得预测性别、数量、健康、成就或孝顺程度。
09 family 六亲：父亲；母亲；兄弟姐妹/同辈。只写关系互动模式与边界建议，不断言家人的能力、财富或寿命。`;

export function buildStaticReadingPrompt(facts: StaticReadingFacts, profile?: BaziLifeProfile) {
  const chartData = { evidence: facts.evidence };
  const rhythm = profile
    ? {
        dayun: profile.dayun.map((step) => ({ ganzhi: step.ganzhi, age: step.ageText, years: step.yearText, current: step.current, basis: step.basis })),
        annual: profile.annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, score: year.score, dayunGanzhi: year.dayunGanzhi, dayunShift: year.dayunShift, basis: year.basis })),
      }
    : undefined;
  const annualRange = profile ? `${profile.annual[0]?.year}–${profile.annual[profile.annual.length - 1]?.year}` : "";
  const template = {
    schemaVersion: "single-full-v3",
    scope: "full-reading",
    sections: Object.fromEntries(REPORT_SECTION_SPECS.map(([key, title, labels]) => [key, {
      title,
      summary: "本章总起",
      insights: labels.map((label) => ({ label, content: "结论→具体盘面依据→现代画像/建议", evidenceIds: ["从输入 evidence 中选择真实 ID"] })),
      advice: ["建议"],
    }])),
    disclaimer: "免责声明(20字以上)：本报告基于传统命理文化，仅供自我观察参考，不构成科学预测或决策依据。",
  };
  return `请依据下面的八字排盘信息，按报告模版生成完整的《八字个人深度解读报告》。

【八字排盘信息】

${JSON.stringify(chartData, null, 1)}

${rhythm ? `【大运流年排盘】（以下对象均由引擎提供。时间类小节必须逐项覆盖，评分原样引用；禁止补算、改分或编造区间外年份）\n\n大运：${JSON.stringify(rhythm.dayun, null, 1)}\n流年（${annualRange}）：${JSON.stringify(rhythm.annual, null, 1)}\n\n` : ""}${TEMPLATE_SECTIONS}

【输出 JSON 结构】(sections 是以九个章节 key 为字段的对象，不是数组；不要输出模板之外的任何字段)

${JSON.stringify(template, null, 1)}`;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("STATIC_READING_NO_JSON");
  return text.slice(start, end + 1);
}

// 宽容剥离:AI 顺手塞进 insight 的多余字段按白名单丢弃,避免 strict 校验整体拒收。
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

export function validateStaticReading(raw: unknown): StaticReading {
  return staticReadingSchema.parse(raw);
}

function validateTemplateLayout(reading: StaticReading) {
  for (const [key, , labels] of REPORT_SECTION_SPECS) {
    const actual = reading.sections[key]?.insights.map((item) => item.label);
    if (!actual || actual.length !== labels.length || actual.some((label, index) => label !== labels[index])) {
      throw new Error(`STATIC_READING_SECTION_ORDER:${key}`);
    }
  }
}

function rhythmLabel(score?: number, tone?: string): z.infer<typeof rhythmItemSchema>["label"] {
  if (typeof score === "number") {
    if (score >= 80) return "明显顺势";
    if (score >= 65) return "温和向好";
    if (score >= 50) return "平稳蓄力";
    if (score >= 40) return "波动调整";
    return "谨慎收缩";
  }
  return tone === "good" ? "温和向好" : tone === "caution" ? "波动调整" : "平稳蓄力";
}

function buildEngineTimelines(profile: BaziLifeProfile) {
  const domains = { career: "事业", wealth: "财富", relationship: "关系" } as const;
  return Object.fromEntries(Object.entries(domains).map(([domain, focusLabel]) => [domain, {
    dayun: profile.dayun.map((step) => ({
      ganzhi: step.ganzhi,
      age: step.ageText,
      years: step.yearText,
      label: rhythmLabel(undefined, step.tone),
      theme: step.theme,
      opportunity: step.focus.find((item) => item.label === focusLabel)?.text ?? step.focus[0]?.text ?? step.theme,
      watch: step.basis.join(" "),
      action: step.advice,
      current: step.current,
    })),
    annual: profile.annual.map((year) => ({
      ganzhi: year.ganzhi,
      year: year.year,
      label: rhythmLabel(year.score),
      score: year.score,
      theme: year.theme,
      opportunity: year.opportunity,
      watch: year.watch,
      action: year.advice,
    })),
  }])) as { career: z.infer<typeof domainTimelineSchema>; wealth: z.infer<typeof domainTimelineSchema>; relationship: z.infer<typeof domainTimelineSchema> };
}

// 把结构校验失败原因转成给模型的纠错提示(zod 错误取首个字段路径)
function describeValidationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const issueMatch = /"path":\s*\[\s*"([^"]+)"/.exec(message);
  const sizeMatch = /expected array to have >=\s*(\d+) items/i.exec(message);
  if (issueMatch && sizeMatch) return `字段 ${issueMatch[1]} 的条目数不足(至少 ${sizeMatch[1]} 条)——每个模版小节一条 insight`;
  return issueMatch ? `字段 ${issueMatch[1]} 结构不符合模板` : message.slice(0, 100);
}

export async function generateStaticReading(callModel: (system: string, prompt: string) => Promise<string>, facts: StaticReadingFacts, profile?: BaziLifeProfile) {
  let lastError: unknown;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // 重试预算:单次上限 240s,总时长超 40s 就不再重试,保证 300s 函数预算内能落 failed 状态
    if (attempt > 0 && Date.now() - startedAt > 40_000) break;
    const suffix = attempt ? `\n\n上次输出未通过结构校验：${describeValidationError(lastError)}。请修正后重新输出完整 JSON。` : "";
    try {
      const text = await callModel(STATIC_READING_SYSTEM_PROMPT, buildStaticReadingPrompt(facts, profile) + suffix);
      const draft = validateStaticReading(sanitizeReportDraft(JSON.parse(extractJson(text))));
      validateTemplateLayout(draft);
      return validateStaticReading({
        ...draft,
        evidence: facts.evidence,
        ...(profile ? { timelines: buildEngineTimelines(profile) } : {}),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("STATIC_READING_INVALID");
}

export function isStaticReading(value: unknown): value is StaticReading {
  return staticReadingSchema.safeParse(value).success;
}
