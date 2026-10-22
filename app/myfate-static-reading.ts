// Single-person deep reading: the model receives three things only — the bazi chart
// data, "interpret it per the template", and the template itself. Dayun/annual ganzhi
// is handed to the model as chart data (the template's per-year sections need it);
// deterministic engine timelines with scores are still merged after validation.
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

const sectionKeys = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "children", "family"] as const;
const evidenceId = z.string().regex(/^(chart|structure|tenGod|relation|area)\.[a-zA-Z0-9_-]+$/u);
const insightSchema = z.object({
  label: z.string().min(2).max(20),
  content: z.string().min(20).max(500),
  evidenceIds: z.array(evidenceId).min(1).max(4).optional(),
}).strict();
const sectionSchema = z.object({
  title: z.string().min(2).max(20),
  summary: z.string().min(30).max(500),
  evidenceIds: z.array(evidenceId).min(1).max(5).optional(),
  insights: z.array(insightSchema).min(2).max(12),
  advice: z.array(z.string().min(8).max(150)).min(1).max(3),
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
  disclaimer: z.string().min(20),
}).strict().superRefine((value, ctx) => {
  if (value.schemaVersion === "single-full-v3" && !value.sections.children) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sections", "children"], message: "single-full-v3 requires children section" });
  }
});

export type StaticReading = z.infer<typeof staticReadingSchema>;
export type StaticReadingFacts = ReturnType<typeof buildStaticReadingFacts>;

// 模版化评分:大运按引擎 tone 确定性映射(展示用,不依赖模型)
const DAYUN_SCORE: Record<BaziLifeProfile["dayun"][number]["tone"], number> = { good: 86, neutral: 70, caution: 56 };

function buildDomainTimeline(profile: BaziLifeProfile, domain: "career" | "wealth" | "relationship") {
  const prefix = domain === "career" ? "事业" : domain === "wealth" ? "资源与财富" : "感情与关系";
  return {
    dayun: profile.dayun.map((step) => ({
      ganzhi: step.ganzhi,
      age: step.ageText,
      years: step.yearText,
      label: toneToLabel(step.tone),
      score: DAYUN_SCORE[step.tone],
      theme: `${prefix}主题：${step.theme}`,
      opportunity: `${prefix}可关注：${step.focus.map((item) => item.text).join("；")}`,
      watch: `${prefix}留意：${step.basis.at(-1) ?? "阶段节奏需要结合现实选择判断"}`,
      action: step.advice,
      current: step.current,
    })),
    annual: profile.annual.map((year) => ({
      year: year.year,
      ganzhi: year.ganzhi,
      label: toneToLabel(year.tone),
      score: year.score,
      theme: `${prefix}年度主题：${year.theme}`,
      opportunity: year.opportunity,
      watch: year.watch,
      action: year.advice,
    })),
  };
}

type Tone = BaziLifeProfile["dayun"][number]["tone"];
type RhythmLabel = z.infer<typeof rhythmItemSchema>["label"];
function toneToLabel(tone: Tone): RhythmLabel {
  return tone === "good" ? "明显顺势" : tone === "caution" ? "谨慎收缩" : "平稳蓄力";
}

export function attachFullReadingTimeline(report: StaticReading, profile: BaziLifeProfile): StaticReading {
  return {
    ...report,
    schemaVersion: "single-full-v3",
    scope: "full-reading",
    timelines: {
      career: buildDomainTimeline(profile, "career"),
      wealth: buildDomainTimeline(profile, "wealth"),
      relationship: buildDomainTimeline(profile, "relationship"),
    },
  };
}

// 唯一的系统指令:按模版解读。命理判断(旺衰/格局/喜忌/神煞/评分/流年断语)全部由模型作出。
export const STATIC_READING_SYSTEM_PROMPT = `你是资深八字命理师。根据提供的八字排盘信息，严格按照模版结构生成完整的「全息八字命理深度解析」报告。写作风格：结论鲜明、画像具体、铁口直断但保留分寸（多半、倾向、更适合），让读者感到被说中。健康章节不做医疗诊断；建议必须是现实中可执行的行为（不用穿戴颜色、方位、法器或所谓"化解"）。输出必须是单个 JSON 对象，不要 Markdown，字段结构严格匹配给定模板。`;

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

const TEMPLATE_SECTIONS = `【报告模版】九大章节固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、children、family，各章 insights 按下列小节组织（label 用小节名，可微调；content 是完整解读段落，可写评分/概率/年份/金额）：

01 portrait 人生画像：旺衰定性（身旺/身弱/从格，生扶克泄五行、日主得令有根情况、喜忌）；道法与路线（如食伤配印/杀印相生/食神生财/财官双美，核心天赋+"定位1+定位2"的立身路线）；喜神（五行+十神，现实中的贵人/资源含义）；忌神（五行+十神，冲动/消耗/竞争压力）；闲神（好闲神/劣闲神+现实对应物）；神煞点睛（按命局自推驿马/羊刃/桃花/贵人等：落在哪柱哪支、有无、现实解读；没有的不写）；外在表象（月令透干给人的印象）；内在心性（日支藏干的真实动机）；行为优劣势与破局（反差优势、心理底色内耗、一句破局建议）。
02 pattern 格局：月令格局（月支藏干与本气/中气透干、格局名、成格率评估、职业方向清晰度）；流通链（最优质的干支十神生克链及其现实投影）；结构瑕疵（如财破印/枭神夺食，计划/平台/情绪被打断的表现）；纯杂程度（纯粹/部分分散/杂乱+一句突破战略）。
03 education 学业：学历评估（普通本科档/本科至硕士档/重点硕博档，核心利学配置与干扰点）；适合专业（4-5 个具体专业门类）；考运关键节点（喜用旺流年超常发挥、忌神旺流年易失常的规律）。
04 career 事业：职业方向（平台属性+角色定位：智囊军师/专业带头人/业务一把手/独立操盘手，不适合的环境）；管理与领导力（风格：中层智囊/铁血开拓/仁怀包容/专业领队，可驾驭规模）；贵人/小人/与上级（类型、场景、向上管理策略）；一生事业轨迹（逐大运：干支+年龄段+评分+阶段定调与断语）；近期流年事业（逐年：年份干支+评分+定调，⚠️风险年/🚀跃升年标记与避坑/作业方向）。
05 wealth 财富：一生财富高度（量级区间+T1/T2/T3/T4 档+算力来源：财星旺衰/贵格加成/黄金大运推力；开头标注"以下为纯天赋计算值，未考虑地域/家庭/社会等因素影响，仅供参考"）；主要获财方式（正财/偏财、稳扎稳打/资本运作/垂直深耕）；一生财富大运（逐大运：财运承压↓/平稳→/向好↑/强劲↑↑+简评）；近期流年财富（逐年：财务标签，⚠️破财高发/💰攒钱黄金+具体建议）。
06 relationship 感情：配偶特征（长相气质/性格支配/能力经济/能否旺你/职业方向：经商/自由职业/体制企管/专业技术艺术）；对方家庭（原生家庭条件、长辈介入度与助力）；婚姻稳定性（夫妻宫冲合刑害、稳定型/动态平衡型/易受拉扯型、隐患与沟通心法）；一生婚恋大运（逐大运：天干十神+地支十神+情感特征）；近期感情流年（逐年：缘分概率%+定调，⚠️危机关口/🌹正缘婚动标记与场景）。
07 wellbeing 健康：身体薄弱器官（五行偏枯受克对应脏腑系统+易出现的症状倾向）；急性病风险（刑冲引发的外伤/炎症/结石手术信号+防护提示，不做医疗诊断）；心理健康倾向（十神偏枯的情绪底色+具体疏导法）。
08 children 子女：子女缘分（男看官杀/女看食伤旺衰，深厚/适中/偏晚偏淡）；子女性别倾向（乾坤造法则，标注约六到七成参考）；子女关系与特质（子女星喜忌、性格倾向、教育省心/操心、成才高度与远近）。
09 family 六亲：父亲（偏财星喜忌根气、缘分深薄、实质助力、沟通模式）；母亲（印星喜忌、绝对贵人或操心牵制、关键庇护/压力）；兄弟姐妹与同辈（比劫喜忌、强力助力或财务边界、求助策略）。`;

export function buildStaticReadingPrompt(facts: StaticReadingFacts, profile?: BaziLifeProfile) {
  const chartData = { evidence: facts.evidence.map((item) => item.fact) };
  const rhythm = profile
    ? {
        dayun: profile.dayun.map((step) => `${step.ganzhi}（${step.ageText}岁段 ${step.yearText}${step.current ? "，当前大运" : ""}）`),
        annual: profile.annual.map((year) => `${year.year} ${year.ganzhi}（引擎参考分${year.score}）`),
      }
    : undefined;
  const template = {
    schemaVersion: "single-full-v3",
    scope: "full-reading",
    sections: Object.fromEntries(sectionKeys.map((key) => [key, {
      title: "章节标题(2-20字)",
      summary: "本章总起(30-500字)",
      insights: [{ label: "小节名(2-20字)", content: "完整解读段落(20-500字)" }],
      advice: ["可执行建议(8-150字)"],
    }])),
    disclaimer: "免责声明(20字以上)：本报告基于传统命理文化，仅供自我观察参考，不构成科学预测或决策依据。",
  };
  return `请依据下面的八字排盘信息，按报告模版生成完整解读。

【八字排盘信息】

${JSON.stringify(chartData, null, 1)}

${rhythm ? `【大运流年排盘】(模版的时间类小节以此为据，评分为引擎参考分，可自行细化断语)\n\n大运：${rhythm.dayun.join("、")}\n流年：${rhythm.annual.join("、")}\n\n` : ""}${TEMPLATE_SECTIONS}

【输出 JSON 结构】(sections 是以九个章节 key 为字段的对象，不是数组；insights 每章 3-12 条；不要输出模板之外的任何字段)

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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = attempt ? `\n\n上次输出未通过结构校验：${describeValidationError(lastError)}。请修正后重新输出完整 JSON。` : "";
    try {
      const text = await callModel(STATIC_READING_SYSTEM_PROMPT, buildStaticReadingPrompt(facts, profile) + suffix);
      const report = validateStaticReading(sanitizeReportDraft(JSON.parse(extractJson(text))));
      return profile ? attachFullReadingTimeline(report, profile) : report;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("STATIC_READING_INVALID");
}

export function isStaticReading(value: unknown): value is StaticReading {
  return staticReadingSchema.safeParse(value).success;
}
