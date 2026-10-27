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

// 唯一的系统指令:按模版解读。命理判断(旺衰/格局/喜忌/神煞/评分/流年断语)全部由模型作出。
export const STATIC_READING_SYSTEM_PROMPT = `你是高级命理咨询顾问兼人生发展架构师，精通传统子平八字与现代商业咨询、职业规划、认知心理学。根据提供的八字排盘信息，严格按照模版结构生成深度、量化、逻辑严密、去迷信化、极具现实指导价值的《八字个人深度解读报告》。
表达规范：
1. 去神棍化与现代化表达：把八字术语翻译为现代人听得懂的语言（如"食伤生财"解释为"才华与技术变现通道"，"比劫夺财"解释为"同辈竞争与合伙利益分流"），术语与白话并用地写进正文。
2. 客观中立、严谨笃定：既不回避命局中的结构性缺陷，也不做宿命论式的恐吓，重点指出"底层天赋配置"与"后天破局策略"。
3. 结构化与量化：严格遵循指定的小标题、评分、区间档位、趋势符号和概率百分比输出，杜绝模糊含混的套话。
4. 格式规范：自然段落与特定标签排版，小标题与字段保持极高一致性。
输出必须是单个 JSON 对象，不要 Markdown，字段结构匹配给定模板。`;

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

const TEMPLATE_SECTIONS = `【报告模版】九大章节固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、children、family，各章 insights 按下列小节组织（label 用小节名，可微调；content 是完整解读段落，可写评分/概率/百分比/年份/金额/趋势符号；正文不要用 Markdown 星号加粗，标签一律用「」或【】）：

01 portrait 人生画像：旺衰定性（命局属性：身强/身弱/从势格/专旺格等，核心五行力量对比；一生最喜的两种五行+现实功能、最忌的两种五行）；道法与喜忌（开头提炼一个道法标签，形如「比劫配财」「印配食伤」「比劫配官杀」「食伤生财」等，再阐明天赋底色的现实意义与做事风格）；喜神/忌神/闲神（分别列出具体十神与五行，括号说明带来的现实赋能或阻碍；闲神若有则分析中性角色，从格注明"从格顺势皆为喜，逆势皆为忌，不单列闲神"）；神煞底色（逐一审查并按【驿马】奔波出海vs稳守本地、【阳刃】极端震荡vs稳健、【桃花】魅力形态与引动时机列出：落在哪柱哪支、有无、现实解读；没有的不写）。
02 pattern 格局：月令格局（月令藏干透干情况，判定格局名：正印格/偏印格/七杀格/建禄格或未成格多面手；标注成格纯度如"本气透出，层级极高"或"余气透出，偏弱但成立"；阐释一生职业基调与聚焦建议）；命盘结构特征（提炼2~3个最显著的干支生克流通组合，如【食伤生财】【杀印相生】【官星合身】【枭神夺食】【伤官见官】【比劫旺盛】，分别标注（核心优势）（职场加成）（双刃剑）定性，剖析利弊）；结构清浊（五行流通顺畅度与发力集中度）。
03 education 学业：学历评估（综合印星、食伤的喜忌与配置，给出学历基底与上限区间：本科倾向/本科至硕士/硕博等；分析认知习惯：实用主义/兴趣驱动/深度理论，与应试特点）；适合专业（结合道法与喜神十神，明确推荐2~3类具体专业领域：商科金融/技术研发/创意传媒/文教战略等）；考运关键节点（走何种五行年份考运思维最清晰、容易超常发挥；何种年份容易压抑焦虑、发挥失常需做抗压准备）。
04 career 事业：职业方向（职场最适生态位：实干经营者/项目操盘手/专业技术骨干/大平台智囊参谋等；是否适合创业或副业）；管理与领导力（领导风格：山头领袖型/军师参谋型/扁平技术型；带队模式：个人魅力/身先士卒/利益捆绑/专业服人；适宜带领的团队规模）；贵人/小人/与上级（贵人=具体十神对应人群如客户/下属/平台领导；小人=具体十神对应形态：竞争型/规则压制型/背刺型；与上级=按官杀状态分析与领导的契合度及服管边界）；一生事业轨迹（按提供的排盘逐大运，格式：XX大运（年龄段）：XX分。事业应期：核心定调与应期事件；关键转折运加⚠️）；近期流年事业（按提供的流年排盘逐年，格式：YYYY年（干支）· 评分XX分：[大运交接标记] 职场动向与行动指南）。
05 wealth 财富：一生财富高度（content 首行必须输出：以下为纯天赋计算值，未考虑地域/家庭/社会等因素影响，仅供参考。然后给具体量级，如「7000万–1亿 之间（准亿级）」「1000万–2000万（千万级中段）」「100万–300万（偏中上段）」，并详细披露量化计算推导链条：原局财星与身强身弱确立的地基档位T级 + 结构加减档 + 核心打拼期大运推力加减档）；主要获财方式（赚钱来源：技术/创意/商业经营/资产收益；若原局比劫旺为忌，必须明确标注合伙风险：规避合伙、防比劫夺财、坚持独立操盘/独资）；一生财富大运（按提供的排盘逐大运，格式：XX大运（年龄段）：财运状态（↑↑/↑/→/↓/↓↓）。财务象：资金流转、蓄水或破耗特征）；近期流年财富（按提供的流年排盘逐年，每年提炼6-8字标签，格式：YYYY年（干支）· [标签]：具体财务建议，如「偏财爆发窗口」「破财高发年」）。
06 relationship 感情：配偶特征（长相气质=配偶星五行映射具体长相/体态骨架/气质印象；性格=配偶星十神性格定义；个人能力=经济独立性与能力强弱；能否旺你=配偶星为喜用神者论旺夫/贤内助及实质赋能；另一半职业方向=以配偶星为太极点推演行业偏向，标注仅供参考）；对方家庭/配偶父母（日支喜忌论对方家庭背景帮扶力度；对应六亲十神论岳父岳母/公公婆婆的话语权与介入度）；婚姻稳定性（审查夫妻宫刑冲克害及比劫干扰，指出易产生隔阂的机制与相处处方）；一生婚恋大运（各步大运对感情的影响，重点指出最适合步入婚姻的黄金大运）；近期感情流年（按提供的流年排盘逐年，格式：YYYY年（干支）· 缘分概率XX%：[特殊冲合/危机标记] 状态提示）。
07 wellbeing 健康：身体薄弱器官（失衡五行推导1~3个中医脏腑与身体系统：肝胆/心血/脾胃消化/呼吸/肾脏泌尿，说明日常易发症状）；急性病风险（原局逢冲克必写：相冲对应的急性病或外伤隐患及高危年份；无冲克则简要说明并给防护方向）；心理健康倾向（性格中紧绷/焦虑/内耗/抑郁倾向的十神根源，给出心理调适与减压出口）。
08 children 子女：子女缘分（子女星与时柱子女宫的旺衰与喜忌）；子女性别倾向（男命比对官杀强弱、女命比对食伤强弱，给出男女孩倾向概率；统一标注：准确率约60-70%，仅供参考）；子女发展/亲子关系（时柱喜忌看子女未来自立能力、对命主的精神/物质孝顺程度、亲子相处模式）。
09 family 六亲：父亲（偏财星的透藏/旺衰/喜忌，论父亲能力、缘分深浅及能否带来资源/财务实质助力）；母亲（正印星的透藏/旺衰/喜忌，论母亲关爱模式：支持庇护vs束缚控制/干涉，与缘分厚薄）；兄弟姐妹/同辈（比肩劫财喜忌论断；为忌神时必须强调竞争关系，明确给出"保持界限、合作慎重"的建议）。

【固定算法与映射表】写以下小节时严格执行，不得另立标准：

一、配偶五行外观映射（06 感情·配偶特征的「长相气质」按配偶星五行查此表展开）：
木=身材挺拔修长、五官清秀、眉眼秀气、发质好；火=眼神有神采、面色红润、五官立体外放、热情有感染力；土=脸型方圆、身形稳重敦厚、皮肉紧实有肉感、给人踏实靠谱感；金=皮肤白净、骨架周正、轮廓棱角分明、气质干练清冷；水=皮肤水灵白皙、眼神灵动聪慧、体态圆润微丰、气质机敏得体。

二、财富 T 档阶梯（05 财富·一生财富高度的地基档位与推导链条按此执行）：
原局基准：身弱无财/印比重重见微财=T8 档，百万中产起步（100万-300万）；身强财通根透干/食伤生财=T5-T6 档，千万起步（1000万-3000万）；从势格成格/财官双美无破=T3-T4 档，千万中上起步（3000万-7000万）。
大运修正：25-50岁连走20年财/食伤喜用运，+1~+1.5档（可拔高至准亿/亿级）；25-50岁连走20年印比忌神运（夺财/逆势），-2~-4档（可压回百万级）。
按「原局基准档±大运修正」得出最终量级区间，并把每一步加减档的理由写进推导链条正文。

三、近期流年打分标尺（04 事业/05 财富的逐年评分、06 感情的缘分概率与状态提示统一按此标尺校准，引擎参考分仅作参照）：
80-95分=流年干支皆为喜用神，且与原局合化为喜用，大运在上行期（高光爆发年）；65-75分=天干透喜、地支为平，或大运良好但流年有小阻力（稳健上升年）；50-64分=喜忌参半、换运过渡期，或有轻微同行竞争（蓄力摸索年）；20-45分=流年干支皆为忌神，刑冲夫妻宫/日主/用神，或发生比劫夺财、印枭夺食（破财/动荡/蛰伏年）。`;

export function buildStaticReadingPrompt(facts: StaticReadingFacts, profile?: BaziLifeProfile) {
  const chartData = { evidence: facts.evidence.map((item) => item.fact) };
  const rhythm = profile
    ? {
        dayun: profile.dayun.map((step) => `${step.ganzhi}（${step.ageText}岁段 ${step.yearText}${step.current ? "，当前大运" : ""}）`),
        annual: profile.annual.map((year) => `${year.year} ${year.ganzhi}（引擎参考分${year.score}）`),
      }
    : undefined;
  const annualRange = profile ? `${profile.annual[0]?.year}–${profile.annual[profile.annual.length - 1]?.year}` : "";
  const template = {
    schemaVersion: "single-full-v3",
    scope: "full-reading",
    sections: Object.fromEntries(sectionKeys.map((key) => [key, {
      title: "章节标题",
      summary: "本章总起",
      insights: [{ label: "小节名", content: "完整解读段落" }],
      advice: ["建议"],
    }])),
    disclaimer: "免责声明(20字以上)：本报告基于传统命理文化，仅供自我观察参考，不构成科学预测或决策依据。",
  };
  return `请依据下面的八字排盘信息，按报告模版生成完整的《八字个人深度解读报告》。

【八字排盘信息】

${JSON.stringify(chartData, null, 1)}

${rhythm ? `【大运流年排盘】(模版的时间类小节以此为据，评分为引擎参考分，可自行细化断语；流年只覆盖 ${annualRange} 年，时间类小节逐年写到该区间为止，不要编造区间外年份)\n\n大运：${rhythm.dayun.join("、")}\n流年（${annualRange}）：${rhythm.annual.join("、")}\n\n` : ""}${TEMPLATE_SECTIONS}

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
