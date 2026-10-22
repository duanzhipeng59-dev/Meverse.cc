// Single-person report: the model explains the engine-owned chart; deterministic dayun/annual
// rhythm is merged after validation, so the model never invents timing data or scores.
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

const sectionKeys = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "children", "family"] as const;
const evidenceId = z.string().regex(/^(chart|structure|tenGod|relation|area)\.[a-zA-Z0-9_-]+$/u);
const insightSchema = z.object({
  label: z.string().min(2).max(20),
  content: z.string().min(20).max(320),
  evidenceIds: z.array(evidenceId).min(1).max(4).optional(),
}).strict();
const sectionSchema = z.object({
  title: z.string().min(2).max(20),
  summary: z.string().min(30).max(360),
  evidenceIds: z.array(evidenceId).min(1).max(5).optional(),
  // 模版化章节(人生画像 7-8 个小节)需要更高上限
  insights: z.array(insightSchema).min(2).max(8),
  advice: z.array(z.string().min(8).max(100)).min(1).max(3),
}).strict();

// v2 起不再要求 AI 回传 evidence 目录与 evidenceIds 引用(页面不展示依据);
// v1 存量报告仍可解析(evidence 字段可选)。
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

type RhythmLabel = "明显顺势" | "温和向好" | "平稳蓄力" | "波动调整" | "谨慎收缩";

function rhythmLabel(tone: "good" | "neutral" | "caution"): RhythmLabel {
  return tone === "good" ? "明显顺势" : tone === "caution" ? "谨慎收缩" : "平稳蓄力";
}

// 模版化评分:大运按引擎 tone 确定性映射(写作/展示用,不引入模型幻觉)
const DAYUN_SCORE: Record<BaziLifeProfile["dayun"][number]["tone"], number> = { good: 86, neutral: 70, caution: 56 };

function buildDomainTimeline(profile: BaziLifeProfile, domain: "career" | "wealth" | "relationship") {
  const prefix = domain === "career" ? "事业" : domain === "wealth" ? "资源与财富" : "感情与关系";
  return {
    dayun: profile.dayun.map((step) => ({
      ganzhi: step.ganzhi,
      age: step.ageText,
      years: step.yearText,
      label: rhythmLabel(step.tone),
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
      label: rhythmLabel(year.tone),
      score: year.score,
      theme: `${prefix}年度主题：${year.theme}`,
      opportunity: year.opportunity,
      watch: year.watch,
      action: year.advice,
    })),
  };
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

// 模版小节铺开:portrait 6-8 条,其余章节 3-8 条(不足即拒收,逼计划覆盖全部小节)
const PLAN_CLAIM_BOUNDS: Record<(typeof sectionKeys)[number], { min: number; max: number }> = {
  portrait: { min: 5, max: 8 },
  pattern: { min: 3, max: 8 },
  education: { min: 3, max: 8 },
  career: { min: 4, max: 8 },
  wealth: { min: 3, max: 8 },
  relationship: { min: 4, max: 8 },
  wellbeing: { min: 3, max: 8 },
  children: { min: 3, max: 8 },
  family: { min: 3, max: 8 },
};
export const staticReadingPlanSchema = z.object({
  scope: z.literal("static-chart-only"),
  sections: z.object(Object.fromEntries(sectionKeys.map((key) => [key, z.array(plannedClaimSchema).min(PLAN_CLAIM_BOUNDS[key].min).max(PLAN_CLAIM_BOUNDS[key].max)])) as Record<(typeof sectionKeys)[number], z.ZodArray<typeof plannedClaimSchema>>).strict(),
}).strict();
export type StaticReadingPlan = z.infer<typeof staticReadingPlanSchema>;

export const STATIC_READING_SYSTEM_PROMPT = `你是 MeVerse 单人八字深度解读作者，按照「全息八字命理深度解析」体系写作：结论鲜明、画像具体、口语化带钩子（"你属于""你的另一半多半"），同时保持条件化措辞（更倾向、多半、适合关注），让读者感到被说中而不被恐吓。

最高优先级规则：
1. 只使用 facts.evidence 中的事实。不得自行计算、修正或补充四柱、十神、旺衰、格局、喜忌、刑冲合害；引擎未提供神煞数据，全文不得出现任何神煞名称（驿马、羊刃、桃花、贵人、华盖等）。
2. 本阶段只分析原局。大运、流年、具体年份、年龄窗口由系统时间线另行生成，正文禁止出现具体年份、岁数、概率、百分比、准确率数字。
3. 严格按照已经通过校验的论证计划写作，不得新增结论。每条解读依次呈现：结构关系、白话含义、现实场景、优势面、过度使用的代价、可执行建议。
4. 关系相合不等于合化。健康章节只能谈五行对应身体系统的保养与就医意识，不得做医疗诊断（禁用癌症、诊断、寿命等表述）。
5. 用条件化表达兜底；这是传统文化自我观察，不是科学预测。
6. 输出必须是单个 JSON 对象，不要 Markdown。字段必须严格匹配指定结构。
7. 不得用穿戴颜色、方位、饰品、法器或所谓"化解"作为建议；建议必须是现实中可观察、可执行的行为。
8. 每个风险判断必须同时写出适用条件、缓冲因素或可控制动作，不制造恐惧；不得伪造用户经历、反馈或现实身份。

九个解读章节固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、children、family，每章结构：title、summary、insights、advice。各章 insights 的小节（label）按以下模版组织，label 可微调（2-20 字）：

portrait 人生画像（建议 6-8 条）：旺衰定性（身旺/身弱 + 哪方五行生扶或克泄较重 + 喜什么来生助或泄秀、忌什么）；道法与路线（如食伤配印、杀印相生、食神生财、财官双美，点出核心天赋与"核心定位1+核心定位2"或某种立身的吃饭路线）；喜神（喜用五行+十神，代表现实中的贵人/资源/学习等含义）；忌神（节制五行+十神，代表冲动/消耗/竞争等现实压力）；外在表象（月令与透干十神给别人的印象，如规矩稳重、气场威严）；内在心性（日支及藏干的真实动机，如极有主见、追求情调，不喜欢被什么束缚）；优劣势与破局（外在内在反差带来的职场人际优势、心理底色的内耗点、一句具体行为破局建议）。
pattern 格局（建议 3-4 条）：月令格局（月支藏干与本气/中气透干情况、格局名与成格评估、职业方向清晰度与深耕建议）；流通链（最优质的干支十神生克链，如官印相生，及其对职场贵人思路的现实投影）；结构瑕疵（如财破印类位置关系，计划/平台/情绪容易被现实利益打断的具体表现）；纯杂程度（纯粹清晰/部分分散/杂乱内耗 + 一句格局突破战略）。
education 学业（建议 3 条）：学历基底（印星与食伤配置推档位：普通本科档/本科至硕士档/硕博倾向档，指出干扰点与备考调整方式）；适合专业（结合道法与格局列 4-5 个具体专业门类，如计算机科学、战略管理、法学、数据分析）；求学考证节奏（喜用五行旺的学习窗口特征与发挥规律，泛指不写年份）。
career 事业（建议 4-5 条）：职业定位（平台属性：体制内/大平台/细分企业/独立工作室 + 角色定位：智囊军师/专业带头人/业务一把手/独立操盘手，以及不适合的环境）；管理与领导风格（中层智囊/铁血开拓/仁怀包容/专业领队，擅长与以理服人/以绩服人的带队方式）；贵人（多为长辈/掌权上司/同龄伙伴，提供平台资源背书）；小人（拖累型/嫉妒竞争型/下属背刺型，在利益分配或项目收尾时防范）；与上级关系（融洽借力/伴君如虎/貌合神离 + 向上管理策略）。
wealth 财富（建议 3 条）：财富量级定位（依据财星旺衰、身强弱与喜用给参考档位区间，如"百万至千万量级（T2-T3 档）参考"，并在该条开头标注"以下为纯天赋计算值，未考虑地域/家庭/社会等因素影响，仅供参考"）；获财方式（正财/偏财哪路更顺、稳扎稳打/垂直深耕/资源运作的求财模式）；风险边界（忌神五行旺的时期特征下需规避的高风险投资与盲目扩张，泛指不写年份）。
relationship 感情（建议 4 条）：配偶画像（长相气质倾向、性格与支配风格、能力与经济独立性、职业方向：经商/自由职业/体制企管/专业技术艺术）；能否旺你（配偶星与夫妻宫为喜为忌，婚后助力或压力磨合）；对方家庭（日支十神看原生家庭条件与长辈介入度、实际助力）；婚姻稳定性（夫妻宫受冲/合/刑害情况，稳定型/动态平衡型/易受拉扯型，隐患与沟通相处心法）。
wellbeing 健康（建议 3 条）：薄弱环节（偏枯或受克五行对应脏腑系统：如肝胆神经/呼吸道/消化系统，日常保养重点）；急性风险信号（刑冲组合提示的外伤/突发炎症/结石手术倾向，逢特定地支流年注意出行防护——只写特征不写年份，不做医疗诊断）；心理能量（十神偏枯的精神紧绷/思虑过甚底色 + 具体疏导方法）。
children 子女（建议 3 条）：子女缘分（男看官杀、女看食伤的旺衰，缘分深厚/适中/偏晚偏淡）；性别倾向（按传统坤造乾造法则给倾向更高的一个，明确写"约六到七成参考"）；相处与培养（子女星为喜为忌，孩子性格倾向：独立要强/文雅温和/叛逆好动，教育与相处建议）。
family 六亲（建议 3 条）：父亲缘分（偏财星喜忌与根气，缘分深厚/较薄、实质助力、沟通模式：像朋友互助/严肃寡言/聚少离多）；母亲缘分（印星喜忌，绝对贵人精神后盾/操心掌控并存，关键时刻庇护或精神压力）；同辈与朋友（比劫喜忌：强力助力或资源竞争消耗，困难时求助策略或财务边界建议）。

顶层固定 schemaVersion="single-full-v3"、scope="full-reading"、sections、disclaimer。不要输出 evidence 或 timelines 字段，时间节奏由系统合并。`;

export const STATIC_READING_PLAN_SYSTEM_PROMPT = `你是 MeVerse 单人八字静态命局的论证规划器。你不写最终报告，只把确定性引擎事实组织成可校验的论证计划。

规则：
1. 只能引用输入 evidence 的 id，不得计算或补充任何命理事实；引擎没有神煞数据，计划中不得出现神煞。
2. 每个 claim 必须完成"结构关系 → 白话含义 → 现实场景 → 优势面 → 风险面 → 行动"的完整链条。
3. inferenceLevel 只能是 fact、strong_inference、weak_inference。strong_inference 至少需要两个独立 evidence id；单一信号只能标为 weak_inference，且不得作为确定结论。
4. 禁止大运、流年、具体年份、年龄、概率、百分比、准确率、疾病诊断、寿命、必然事件。允许且鼓励：学历档位评估、配偶画像（气质性格职业方向）、财富量级档位（纯天赋计算参考）、子女性别倾向（须标注约六到七成参考）、管理风格与贵人小人画像——这些是基于十神喜忌的条件化推断，不是时间预测。
5. action 必须是可观察行为；禁止颜色、方位、穿戴、饰品、法器、风水物或"化解"。
6. 风险面必须有缓冲条件或可控制动作，不得恐吓。
7. 输出单个 JSON 对象，不要 Markdown。结构固定为 {"scope":"static-chart-only","sections":{九个固定章节 key:[claim 数组]}}。每章 claim 数量下限:portrait 至少 5 条,pattern/education/wealth/wellbeing/children/family 至少 3 条,career/relationship 至少 4 条——每个模版小节一条 claim,宁多勿少。
8. 每章 claim 覆盖该章模版小节：portrait 覆盖旺衰定性/道法路线/喜神/忌神/外在内在性格；pattern 覆盖月令格局/流通链/瑕疵/纯杂度；education 覆盖学历档/适合专业/考证节奏；career 覆盖职业定位/管理风格/贵人/小人/上级关系；wealth 覆盖量级档位/获财方式/风险边界；relationship 覆盖配偶画像/旺你与否/对方家庭/婚姻稳定性；wellbeing 覆盖薄弱系统/急性信号/心理能量；children 覆盖缘分/性别倾向/相处培养；family 覆盖父亲/母亲/同辈。`;

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
    entry("area.children", `时柱${chart.pillars[3].ganzhi}对应长远愿景与晚辈互动，藏干十神为${chart.pillars[3].hideShiShen.join("、")}；食伤权重${profile.tenGods.find((item) => item.name === "食伤")?.value ?? 0}。这里用于讨论子女缘分、按传统法则的性别倾向（需标注约六到七成参考）以及陪伴、表达和边界。`),
    ...sectionKeys.flatMap((key) => {
      if (key === "children") return [];
      const areaKey = key === "portrait" || key === "pattern" ? "personality" : key === "education" ? "talent" : key === "relationship" ? "relationship" : key === "wellbeing" ? "wellbeing" : key;
      const area = profile.areas[areaKey as keyof typeof profile.areas];
      const staticDetails = area.details.filter((detail) => !/(大运|流年|具体年份)/u.test(detail));
      return [entry(`area.${key}`, `${area.summary} ${staticDetails.join(" ")}`)];
    }),
  ];
  return {
    scope: "static-chart-only" as const,
    exclusions: ["dayun", "annual", "forecast", "medical-diagnosis"],
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

输出必须是单个 JSON 对象,严格匹配下面的模板结构(sections 是以九个章节 key 为字段的对象,每个字段的值是 claim 数组、每章 2-4 条;不要输出模板之外的任何字段):

${JSON.stringify(template, null, 1)}

输入事实(唯一事实来源,evidenceIds 只能引用其中真实存在的 id):

${JSON.stringify({ facts }, null, 2)}`;
}

export function buildStaticReadingPrompt(facts: StaticReadingFacts, plan: StaticReadingPlan) {
  // 精确输出模板:sections 必须是以章节 key 为字段的对象(不是数组)
  const template = {
    schemaVersion: "single-full-v3",
    scope: "full-reading",
    sections: Object.fromEntries(sectionKeys.map((key) => [key, {
      title: "章节标题(2-20字)",
      summary: "本章总结(30-360字)",
      insights: [{ label: "小标题(2-16字)", content: "命理解读(20-260字)" }],  // 每条 insight 只有 label 与 content 两个字段;计划 claim 的 action 写入章节级 advice
      advice: ["可执行建议(8-100字)"],
    }])),
    disclaimer: "免责声明(20字以上):本报告基于传统命理文化的自我观察参考,不构成科学预测或决策依据。",
  };
  return `依据以下已校验论证计划生成九章命局基础解读。不得新增、删除或改变计划中的核心结论。

输出必须是单个 JSON 对象,严格匹配下面的模板结构(字段名、类型、嵌套完全一致;sections 是以九个章节 key 为字段的对象,不是数组;insights 每章 2-8 条(按各章模版小节组织,label 用模版小节名);advice 每章 1-3 条;不要输出模板之外的任何字段):

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

// 模版化改造:放开学历档/配偶画像/财富量级/子女性别倾向等条件化推断;
// 仍禁具体时间(年份/岁数,时间线由引擎提供)、概率数值与医疗红线、绝对化断言。
const forbidden = /(\b20\d{2}年|\d+岁|概率|\d+%|准确率\d|癌症|诊断|寿命|注定|一定会)/u;
const superstitiousAction = /(穿|佩戴|摆放|朝向|方位|颜色|饰品|法器|符咒|改运|化解)/u;

export function validateStaticReadingPlan(raw: unknown, facts: StaticReadingFacts): StaticReadingPlan {
  const plan = staticReadingPlanSchema.parse(raw);
  const validIds = new Set(facts.evidence.map((item) => item.id));
  for (const key of sectionKeys) {
    for (const claim of plan.sections[key]) {
      if (claim.evidenceIds.some((id) => !validIds.has(id))) throw new Error("STATIC_READING_PLAN_UNKNOWN_EVIDENCE");
      if (claim.inferenceLevel === "strong_inference" && new Set(claim.evidenceIds).size < 2) throw new Error("STATIC_READING_PLAN_WEAK_SUPPORT");
      const text = Object.values(claim).filter((value) => typeof value === "string").join(" ");
      if (forbidden.test(text)) throw new Error("STATIC_READING_PLAN_UNSUPPORTED_CLAIM");
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
  if (message === "STATIC_READING_PLAN_UNSUPPORTED_CLAIM") return "claim 包含禁用内容(具体年份/岁数/概率数值/医疗断言等预测性表述)";
  if (message === "STATIC_READING_PLAN_ACTION_FORBIDDEN") return "action 含颜色/方位/饰品/法器等迷信化表述";
  const issueMatch = /"path":\s*\[\s*"([^"]+)"/.exec(message);
  return issueMatch ? `字段 ${issueMatch[1]} 结构不符合模板` : message.slice(0, 100);
}

export async function generateStaticReading(callModel: (system: string, prompt: string) => Promise<string>, facts: StaticReadingFacts, profile?: BaziLifeProfile) {
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
      ? `\n\n上次输出未通过校验：${describeValidationError(lastError)}。请重新输出完整 JSON：sections 保持以九个章节 key 为字段的对象结构，全文不得出现「具体年份、岁数、概率、百分比、准确率数字、癌症/诊断/寿命、注定、一定会」等表述（大运流年时间线由系统生成）。`
      : "";
    try {
      const text = await callModel(STATIC_READING_SYSTEM_PROMPT, buildStaticReadingPrompt(facts, plan) + suffix);
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
