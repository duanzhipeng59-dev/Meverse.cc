// Single-person deep reading: the model receives three things only — the bazi chart
// data, "interpret it per the template", and the template itself. Dayun/annual ganzhi
// is handed to the model as chart data (the template's per-year sections need it);
// deterministic engine timelines with scores are still merged after validation.
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

const sectionKeys = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "children", "family"] as const;
const evidenceId = z.string().regex(/^(chart|structure|tenGod|relation|area|shensha)\.[a-zA-Z0-9_-]+$/u);
const insightSchema = z.object({
  label: z.string(),
  content: z.string(),
  evidenceIds: z.array(evidenceId).min(1).max(4).optional(),
}).strict();
const sectionSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
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

// 唯一的系统指令:引擎负责算准,模板负责表达,AI 只依据排盘填充与润色(蒸馏写作模板 V2.0)。
export const STATIC_READING_SYSTEM_PROMPT = `你是精通传统八字命理、擅长现代人物画像的资深命理分析师。你的任务不是重新创作命理文章，而是根据八字引擎提供的确定性排盘数据，按九章35字段蒸馏模板生成专业、具体、有个人针对性的《MeVerse 个人八字报告》——像经验丰富的命理师在直接解读用户，而不是 AI 在解释命理知识。
写作规则：
1. 先下结论，再讲盘面依据，最后落到现实的人物特征、行为模式或发展方向；结论要直接、有判断力、有鲜明的人物指向性。
2. 专业术语必须转化为人物画像：不能只解释十神五行格局的定义，要写清"这意味着你怎样"。
3. 全程第二人称「你」，少用"命主""可能体现出某种倾向"等生硬表达；结论先行，术语后紧跟白话。
4. 不同字段用不同结构：简单判断字段1-3句话直接给结论；人物画像字段先定性再展开1-3段；大运流年逐项断语；字数由内容决定，不为凑字数扩写，不为简短牺牲深度。
5. 内容必须具体，杜绝"有一定潜力""需要多沟通"式空话；不同命盘要生成不同判断、不同人物标签，避免人人都适用的描述。
6. 优势与短板并存：重要判断写清核心优势、成因、发挥条件、何种环境下可能变短板。
7. 禁止编造命理事实：四柱藏干十神、旺衰格局喜忌、神煞及其位置、刑冲合害、大运顺序与起运、流年干支只能来自排盘数据；证据不足时降低判断强度或注明依据不足，不得补造。
8. 不写确定事实：不写必然结婚或破裂的年份、疾病诊断、子女数量或未来成就、未经验证的概率与准确率；不用"注定""必然""一定发财""绝不会"等绝对化措辞；命理解读保持传统文化解释属性（例外：财富章按 T 档阶梯输出天赋计算量级（首行免责声明），感情流年按百分比输出缘分概率，子女章的性别倾向判断（必须带"准确率约60-70%，仅供参考"标注），均属该章标准量化格式）。
输出必须是单个 JSON 对象，不要 Markdown，字段结构匹配给定模板。`;

// 明星报告版系统指令:与个人版同一套蒸馏模版与写作规则,仅称呼改为「TA」(上传规范硬性规则:全文用TA)。
export const STATIC_READING_STAR_SYSTEM_PROMPT = `你是精通传统八字命理、擅长现代人物画像的资深命理分析师。你的任务不是重新创作命理文章，而是根据八字引擎提供的确定性排盘数据，按九章35字段蒸馏模板生成专业、具体、有个人针对性的《MeVerse 明星生辰报告》——像经验丰富的命理师在直接解读这位公众人物，而不是 AI 在解释命理知识。
写作规则：
1. 先下结论，再讲盘面依据，最后落到现实的人物特征、行为模式或发展方向；结论要直接、有判断力、有鲜明的人物指向性。
2. 专业术语必须转化为人物画像：不能只解释十神五行格局的定义，要写清"这意味着TA怎样"。
3. 全程用「TA」称呼（不用"你/你们"），结论先行，术语后紧跟白话。
4. 不同字段用不同结构：简单判断字段1-3句话直接给结论；人物画像字段先定性再展开1-3段；大运流年逐项断语；字数由内容决定，不为凑字数扩写，不为简短牺牲深度。
5. 内容必须具体，杜绝"有一定潜力""需要多沟通"式空话；不同命盘要生成不同判断、不同人物标签，避免人人都适用的描述。
6. 优势与短板并存：重要判断写清核心优势、成因、发挥条件、何种环境下可能变短板。
7. 禁止编造命理事实：四柱藏干十神、旺衰格局喜忌、神煞及其位置、刑冲合害、大运顺序与起运、流年干支只能来自排盘数据；证据不足时降低判断强度或注明依据不足，不得补造。
8. 不写确定事实：不写必然结婚或破裂的年份、疾病诊断、子女数量或未来成就、未经验证的概率与准确率；不用"注定""必然""一定发财""绝不会"等绝对化措辞；命理解读保持传统文化解释属性（例外：财富章按 T 档阶梯输出天赋计算量级（首行免责声明），感情流年按百分比输出缘分概率，子女章的性别倾向判断（必须带"准确率约60-70%，仅供参考"标注），均属该章标准量化格式）。
输出必须是单个 JSON 对象，不要 Markdown，字段结构匹配给定模板。`;

// 明星报告附加规则,拼在用户 prompt 末尾:三柱盘(时柱未定)的写作约束。
export const STAR_REPORT_PROMPT_SUFFIX = `\n\n【明星报告附加规则】
- 本报告对象是公众人物，全文一律用「TA」称呼，模版行文中出现「你」的地方全部改为「TA」叙述；行内子标签同样改（如"能否旺你"写成"能否旺TA"），正文与标签都不出现"你"。
- 出生时间不公开，时柱未定：排盘只有年/月/日三柱。凡模版要求引用时柱的内容（子女宫、时柱藏干、晚运宫位等），一律不引用时柱，改用三柱内的依据（子女缘分按子女星论、夫妻宫仍看日支）；确需时柱才能下的判断，如实写"时柱未定，依据不足"，不猜测、不虚构。
- 大运、流年干支与年龄仍严格按排盘数据输出。`;

function entry(id: string, fact: string) {
  return { id, fact, source: "bazi-engine" as const };
}

// 神煞三件套(驿马/阳刃/桃花)的确定性推算,规则取子平通行口径:
// 驿马/桃花以年支、日支起三合局查其余各支;阳刃按阳干日主查帝旺支(阴干无刃)。
// 结果作为排盘事实下发给第一章「神煞底色」,模型不得自行另算或虚构。
const YI_MA_OF: Record<string, string> = { 申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };
const TAO_HUA_OF: Record<string, string> = { 申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" };
const YANG_REN_OF: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

export function buildShenShaFacts(chart: BaziChart) {
  const pillars = chart.pillars.map((pillar) => ({ label: pillar.label, branch: pillar.ganzhi[1] ?? "" }));
  // 以年支/日支为基准查目标支,命中其余三柱(不含基准柱自身);同柱多基准命中时合并为一条
  const scanByRefs = (targetOf: (branch: string) => string | undefined) => {
    const byPillar = new Map<string, string[]>();
    for (const ref of [pillars[0], pillars[2]]) {
      const target = targetOf(ref.branch);
      if (!target) continue;
      for (const pillar of pillars) {
        if (pillar === ref || pillar.branch !== target) continue;
        const key = `${pillar.label}${pillar.branch}`;
        byPillar.set(key, [...(byPillar.get(key) ?? []), `以${ref.label}${ref.branch}查得${target}`]);
      }
    }
    return [...byPillar.entries()].map(([hit, refs]) => `${hit}（${refs.join("、")}）`);
  };
  const yiMa = scanByRefs((branch) => YI_MA_OF[branch]);
  const taoHua = scanByRefs((branch) => TAO_HUA_OF[branch]);
  const renBranch = YANG_REN_OF[chart.dayMaster];
  const yangRen = renBranch
    ? pillars.filter((pillar) => pillar.branch === renBranch).map((pillar) => `${pillar.label}${pillar.branch}（日主${chart.dayMaster}为阳干，刃在${renBranch}）`)
    : [];
  const pillarWord = `${pillars.length}柱`;
  return [
    entry("shensha.yima", yiMa.length ? `神煞驿马：原局见驿马，位于${yiMa.join("、")}，传统象征流动、出行与环境变化。` : `神煞驿马：以年支、日支查${pillarWord}，原局未见驿马。`),
    entry("shensha.yangren", yangRen.length ? `神煞阳刃：原局见阳刃，位于${yangRen.join("、")}，传统象征刚强、果断与行动锋芒。` : `神煞阳刃：${renBranch ? `阳刃支未在${pillarWord}出现` : `日主${chart.dayMaster}为阴干，通行口径无阳刃`}，原局未见阳刃。`),
    entry("shensha.taohua", taoHua.length ? `神煞桃花：原局见桃花，位于${taoHua.join("、")}，传统象征社交魅力与情感吸引力。` : `神煞桃花：以年支、日支查${pillarWord}，原局未见桃花。`),
  ];
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
    ...buildShenShaFacts(chart),
    // 三柱盘(出生时间不公开,如明星报告)没有时柱:子女论断改以子女星为据,不虚构宫位
    chart.pillars[3]
      ? entry("area.children", `时柱${chart.pillars[3].ganzhi}对应子女与晚辈，藏干十神为${chart.pillars[3].hideShiShen.join("、")}；食伤权重${profile.tenGods.find((item) => item.name === "食伤")?.value ?? 0}。`)
      : entry("area.children", `时柱未定（出生时间不公开），子女与晚辈的论断以子女星（男命看官杀、女命看食伤）与命局喜忌为据，不涉及时柱宫位；食伤权重${profile.tenGods.find((item) => item.name === "食伤")?.value ?? 0}。`),
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

const TEMPLATE_SECTIONS = `【报告模版】九章固定为 portrait、pattern、education、career、wealth、relationship、wellbeing、children、family，共 35 个字段，各章 insights 按下列字段顺序组织（label 用字段名，不增不减不改序；content 为完整解读：简单字段1-3句话直接给结论，画像字段先定性再展开，大运流年逐项断语；字数由内容决定，不为凑字数扩写；正文不用 Markdown 星号，标签一律用「」或【】）：

01 portrait 人生画像（7字段，短句直断，每字段1-3句，结论词打头）：旺衰定性（开头直接定性"你的命局属于身强/身弱/从势"——以排盘给定的旺衰为准（排盘只出这三档），不得自行输出"中和""平衡"之类的中间档；从势格点明"日主孤立无援、弃命从势"，喜忌表述为"顺势皆为喜，逆势（比劫/印星帮扶）皆为忌"；点名最强五行及其十神与力量表现（如"木（比肩/劫财）的力量非常强旺，自我意识和抗压能力极强"）；用"因此"引出一生最喜的两种五行+括号内十神与功能短语（如"土（财星，能让你落地变现）"）、最忌的两种五行+后果短语（如"水（印星，会让你想法多行动少）"））；道法与喜忌（开头给出道法标签「XX」（如「比劫配财」「印配食伤」「伤官配杀」），随后解释组合的天然优势，以"你天生…""你不是…而是…"式的人物定性句收出做事风格与现实角色）；喜神（一行式：五行（十神，带来…）、五行（十神，带来…），只列清单加短语，不展开）；忌神（与喜神同一行式，短语写带来的竞争/消耗/束缚）；闲神（五行（十神）起头，一两句说明其中性作用与边界；无闲神写"无"并一句带过）；神煞底色（分驿马/阳刃/桃花三项，每项用"名称：有/无——解读"格式：有则写落点地支与柱位、五行属性与引动特征及时段；无则直接解读这种"无"的人命意义（如驿马无=轨迹相对安稳、适合固定基本盘深耕；阳刃无=少极端暴烈冲动、财务婚姻不易剧烈震荡；桃花无=魅力不走外显社交路线），解读用倾向性表述）；性格与行为模式（外在表现→内在动机→内外反差→心理底色→一句有辨识度的收束，自然段呈现，基于实际十神与五行组合）。
02 pattern 格局（3字段，短句直断，必须引用具体干支）：月令格局（先写盘面事实："你的月令藏干透出了X"，给出格局名并括注成色（如"本气透出，层级极高"/"余气透出，偏弱"），可再点一个带格局色彩的透干（"同时X干透出X，带有X格的色彩"）；随后直接落到人生路径含义与聚焦建议，用"但也正因为…更需要你…——…才是关键"的句式收出断语，不空谈职业基调）；命盘结构特征（提炼2-3个最显著的组合，每个组合独立成段，格式为"结构名称（核心优势/职场加成/双刃剑）：具体干支依据（如"年干的丙火（伤官）顺生月支和时支的土（财星）"）→ 生动现实解读（你脑子活、点子多…）→ 一句定性收尾（如"是最顺的赚钱结构""在体制或大平台内也能游刃有余"）；结构名必须与实际盘面相符，不得强套）；结构清浊（一段话：直接说清浊与发力主线，用「用X生X」点出主线，并以条件句收尾，如"只要大运流年不来破坏这股气，你的目标感和执行力就能得到最大化发挥"）。
03 education 学业（3字段，短句直断）：学历评估（先写盘面结构："你的命局中印星（五行）力量偏弱/强旺且被X星（五行）压制，加上X（十神）透出，属于典型的「XX（谁为主）」结构"；随后人物化解读天分与学习习惯，如"你天分极高，脑子转得快，很多东西一遍就会，但容易挑科目、凭兴趣驱动，不喜欢死记硬背"；末尾用"命理倾向你的学历基底在X档（如本科倾向），若能发挥特长，上限可达更高，但过程容易有波动"的缓和档位表述收尾，不写确定学历）；适合专业（开头直接定性"你非常适合需要X、X和X思维的领域"；用"首选：…（X星主导）；其次：…（X发力）"的分级清单，每类括注十神依据；以"相比于纯理论研究，你更适合…"式对比句收尾）；考运关键节点（写具体年份并附干支，如"2026丙午、2027丁未"（年份干支一律取自提供的流年排盘，不得编造）：何类年份思维最活跃、考运超常发挥；何类年份容易压抑分心、关键考试需提前做抗压准备）。
04 career 事业（5字段）：职业方向（开头身份定性："你是一个天生的「XX」与「XX」"；点出最适路径与结构依据，如"最适合你的路径是食伤生财——靠技术、创意、产品或商业模式来赚钱，而不是单纯靠熬资历"；写清大平台里的角色定位，以及是否适合创业或副业）；管理与领导力（先定型："属于典型的「山头领袖型/军师参谋型/扁平技术型」"；写自我驱动力、敢不敢拍板、适合一把手还是辅助位、讨厌什么样的管理、适合的团队文化；以能驾驭的团队规模与服众方式收尾）；贵人/小人/与上级（一个字段内分三行："贵人：…"写能带来资源客户或赏识提携的人群（括注十神）；"小人：…"写重点防范的小人类型与现实表现（括注十神为忌），如"你越强，他们越来挑战"；"与上级关系：…"写与领导的契合度与服管边界（括注如官星合身/伤官傲气），如"遇到能力不如你的上级，你会很难服管"）；一生事业轨迹（按排盘逐大运，格式："XX大运（年龄范围）：XX分。事业应期： 十年定调+具体展开+注意事项"，每步大运都必须打分，分数结合引擎参考分；关键转折运在句中加⚠️并直说（如"⚠️这是你人生的黄金爆发期"））；近期流年事业（按提供的流年排盘逐年，格式："YYYY年（干支）· 评分XX分：年度动向与行动指南"，每年都必须打分；逢换运头一两年在评分后加〔大运交接标记〕（如"〔行X大运⚠️换运头1年，基调由大运定〕"）；高光年、蛰伏年直接点明）。
05 wealth 财富（4字段）：一生财富高度（content 首行必须原样输出：以下为纯天赋计算值，未考虑地域/家庭/社会等因素影响，仅供参考。随后直接给量级结论："你的财富量级在 X–X 之间（X级）"；再按下方【财富 T 档阶梯】披露完整推导链条：原局基准T级+逐项加减档及理由，如"起步T5；食伤生财结构清晰（+1档）；用神链条顺生无破（+0.5档）；28-47岁连走两步强劲财运（推力累加+1.5档），将财富天花板大幅上修"）；主要获财方式（强断语开头，如"你绝不是靠死工资发财的人"；点出获财结构（食伤生财/财星透干等）与变现路径：做生意/副业/项目分红/资产收益；比劫旺为忌时必须强调"强烈规避与人合伙，否则极易发生比劫夺财，自己独立操盘是守住财富的关键"）；一生财富大运（按排盘逐大运，格式："XX大运（年龄范围）：财运状态（↑↑/↑/→/↓/↓↓）。财务象： 该十年资金流转/蓄水/破耗的具体描述"，黄金十年直说（如"人生第一波财富大爆发！…这是你攒钱、置产的黄金十年"））；近期财富流年（按提供的流年排盘逐年，格式："YYYY年（干支）· 6-8字年度标签：具体财务建议"，标签要有辨识度（如"破财高发年""偏财爆发窗口""攒钱黄金年""守财防耗年"），暴富年/破财年直接点明，建议具体（捂紧钱包/见好就收/切忌加杠杆））。
06 relationship 感情婚姻（5字段）：配偶特征（一个字段内分五行："长相/气质：…"按配偶星五行查下方【配偶五行取象映射】写长相体态气质；"性格：…"按配偶星十神写性格与相处模式（如"平等的「合伙人」关系"）；"个人能力：…"按配偶星力量与根气写对方独立性与收入能力（强且有根=能独当一面的贤内助/贤外助）；"能否旺你：…"配偶星为喜用论旺你与实质助力，为忌则写消耗点；"另一半职业方向：…"以配偶星为太极点推演行业偏向（括注组合依据如官印相生），注明仅供参考）；对方家庭/配偶父母（先按夫妻宫十神喜忌论对方原生家庭条件与实质帮衬（忌神时直说"条件相对普通、帮衬有限，甚至带来人情压力"）；再按六亲十神并落到具体柱位写对方父母（如"代表岳父的X藏在年支本气，存在感较强、有一定话语权；代表岳母的X透在年干，性格外向直接"），男命称岳父岳母、女命称公公婆婆）；婚姻稳定性（先给结论："你的婚姻稳定性偏X（较高/中等需多维护）"；引用具体冲刑合害（如"夫妻宫（X）与年支（X）相刑、与时支（X）相害，代表隐性隔阂/节奏差异/冷战式摩擦"）；比劫偏旺的盘面加上「比劫夺财」风险提醒（防外人介入或同辈干扰）；末尾给具体处方（保持沟通、财务适当隔离、留足个人空间））；一生婚恋大运（按排盘逐大运，格式："XX大运（年龄范围）：天干X十神+地支X十神。 该运感情描述"；最适合成婚的大运直说（"这是你最容易成婚、且婚姻质量最高的大运！"），最需防范的大运也直说（"婚姻最需注意、防范危机的大运"）；晚年运可合并表述）；近期感情流年（按提供的流年排盘逐年，格式："YYYY年（干支）· 缘分概率XX%：状态提示"；概率按该年配偶星与夫妻宫状态在20%-90%间取值；夫妻宫逢冲合的年份在状态前加〔夫妻宫冲合〕标记（如"〔夫妻宫冲合〕⚠️分手/危机风险""〔夫妻宫冲合〕感情危机解除，关系重新绑定"）；正缘强的年份直说（"正缘信号强，非常适合确认关系或推进婚姻/领证"））。
07 wellbeing 健康（2字段）：身体薄弱器官（按五行偏枯直指脏腑：写清过旺的X（肝胆/心血/脾胃/呼吸/肾脏泌尿）力量如何、被克或被泄的弱X受到什么影响，用"因此，你一生中最需要注意的是X和X系统的健康"引出，症状写具体倾向（如消化不良、胃酸、肠胃敏感、肾气不足、过度疲劳）；可再补一个偏弱被泄脏腑的日常注意（作息/休息），只写倾向，不下疾病诊断结论）；心理健康倾向（先写十神结构带来的心理底色，如"自信、要强且思维活跃"；再写"由于缺乏/过旺某十神（X星）"，在面对高压或目标未达成时容易产生的情绪（急躁/焦虑/内耗），配一句有画面感的描述（如"「想得多、停不下来」的精神紧绷感"）；末尾给一个具体可执行的调适建议（如"培养能让自己慢下来的爱好"））。
08 children 子女（3字段）：子女缘分（子女星（男命看官杀、女命看食伤）的力量与喜忌，直接给结论"代表你与子女的缘分很深/适中/偏晚偏淡"，并写孩子的聪明才华特质与和你关系的亲密度）；子女性别倾向（写明命法依据（男命看官杀、女命看食伤），引用具体十神状态（如"正官（庚金）透出且合身"），给出倾向判断（"倾向于生女孩/男孩的概率稍大一些"），句末统一标注（准确率约60-70%，仅供参考））；子女发展（时柱（子女宫）的十神喜忌，写子女独立发展的程度，以及晚年能否在经济和生活上给你带来实质性的孝顺与回馈）。
09 family 六亲（3字段）：父亲（写代表父亲的偏财星状态与柱位藏透，如"偏财藏在月支本气"；结合喜忌给结论：缘分较深/偏薄、父亲能力强弱，以及他能否在你人生关键节点（尤其财务或资源上）给予资助与启发的具体维度）；母亲（写代表母亲的正印（或偏印）状态（透干/藏于何支/原局不显），结合喜忌给结论：缘分厚薄、母亲的关爱模式与参与度（支持庇护/操心干涉/参与度不高干涉较少），并落到你与母亲相处的现实样貌，弱缘也直说（"你更多是靠自己独立打拼"））；兄弟姐妹（先写比劫喜忌（如"比劫为你的忌神"），给结论：与兄弟姐妹及同辈朋友相处易出现的情形（竞争资源、互相攀比/互相扶持），能否得到无私的实质帮扶，以及相处建议（为忌时"保持适当距离为佳"，为喜时写帮扶与合伙方向））。

【配偶五行取象映射】（06·配偶外在气质按配偶星五行查此表展开）：
木=身材挺拔修长、五官清秀、眉眼秀气、发质好；火=眼神有神采、面色红润、五官立体外放、热情有感染力；土=脸型方圆、身形稳重敦厚、皮肉紧实有肉感、给人踏实靠谱感；金=皮肤白净、骨架周正、轮廓棱角分明、气质干练清冷；水=皮肤水灵白皙、眼神灵动聪慧、体态圆润微丰、气质机敏得体。

【财富 T 档阶梯】（05·一生财富高度的地基档位与推导链条按此执行，不得另立标准）：
原局基准：身弱无财/印比重重见微财=T8 档，百万中产起步（100万-300万）；身强财通根透干/食伤生财=T5-T6 档，千万起步（1000万-3000万）；从势格成格/财官双美无破=T3-T4 档，千万中上起步（3000万-7000万）；介于其间的盘面就近取档。
大运修正：25-50岁连走20年财/食伤喜用运，+1~+1.5档（可拔高至准亿/亿级）；25-50岁连走20年印比忌神运（夺财/逆势），-2~-4档（可压回百万级）。
量级参考：T8≈100万-300万、T6-T5≈1000万-3000万、T4-T3≈3000万-7000万、T2-T1≈7000万以上直至亿级（准亿级=7000万-1亿）；相邻档位可按结构清晰度微调表述。

【最终校验】输出前核对：35字段完整、名称与顺序正确；所有五行十神身份、格局名称、喜忌分类、神煞位置与排盘一致；大运顺逆、起运年龄、流年干支全部来自排盘；无编造的刑冲合害、无重复套话、无机械扩写、无确定性预测或绝对化措辞（例外：财富量级按 T 档阶梯输出且首行为免责声明，感情流年的缘分概率按百分比输出，子女性别倾向带"准确率约60-70%，仅供参考"标注，均属该章标准量化格式）。`;

// ── 表达层约束(压模型浮夸/膨胀漂移):prompt 规则与生成后机器校验共用同一份常量,数字永远同步。
// 字数上限按本地合格产出(DeepSeek)实测最大值 × ~1.25 余量标定;违规信息经重试通道喂回模型自行压缩改写。
// 禁词表只收纯营销腔词;「天花板」「碾压」等在财富/忌神语境里是规范用词,不列入避免误伤
export const BANNED_STYLE_WORDS = ["破圈", "出圈", "魅力四射", "聚光灯", "王炸", "暴击", "拿捏", "封神", "杀疯了", "绝绝子", "yyds"];
const FIELD_CHAR_LIMITS: Record<string, number> = {
  喜神: 60, 忌神: 60, 闲神: 90, 子女性别倾向: 140,
  母亲: 155, 父亲: 160, 子女发展: 160, 兄弟姐妹: 165, 适合专业: 170, 考运关键节点: 180,
  结构清浊: 190, 道法与喜忌: 200, "对方家庭/配偶父母": 210, 神煞底色: 220, 子女缘分: 220,
  婚姻稳定性: 230, 管理与领导力: 230, 学历评估: 240, 月令格局: 240, 身体薄弱器官: 240,
  主要获财方式: 250, 旺衰定性: 260, "贵人/小人/与上级": 260, 心理健康倾向: 270, 职业方向: 280,
  一生财富高度: 340, 性格与行为模式: 370, 配偶特征: 380, 一生婚恋大运: 460, 命盘结构特征: 530,
  一生财富大运: 600, 近期财富流年: 650, 近期感情流年: 700, 近期流年事业: 800, 一生事业轨迹: 750,
};
const DEFAULT_FIELD_CHAR_LIMIT = 400;

const TEMPLATE_STYLE_RULES = `【表达层硬约束】写作风格与篇幅,违反会被系统打回重写:
- 语气:命理师断语感——克制、具体、有判断力;不堆形容词、不写营销文案腔。
- 道法标签为4-6字单标签为宜(如「比劫配财」「食神制杀」),最多不超过8字,禁止把多个结构塞进一个标签。
- 禁用词:破圈/出圈/魅力四射/聚光灯/王炸/暴击/拿捏/封神等浮夸词;每字段感叹号最多2个。
- 句式:每字段第一句必须是结论句;短句直断,平均句长不超过40字;术语后括号紧跟白话。
- 各字段字数上限(超出即违规):${Object.entries(FIELD_CHAR_LIMITS).map(([label, limit]) => `${label}${limit}`).join("、")};其余字段400。超限先删修饰语与重复论证,不删命理判断。`;

// 表达层机器校验:返回违规清单(最多3条,控制在重试提示的100字内);空数组=通过。
export function checkStaticReadingStyle(report: StaticReading): string[] {
  const violations: string[] = [];
  const full = JSON.stringify(report);
  for (const word of BANNED_STYLE_WORDS) {
    if (full.includes(word)) { violations.push(`禁词「${word}」`); break; }
  }
  const daofa = report.sections.portrait.insights.find((item) => item.label.includes("道法"));
  const daofaTag = daofa ? /「([^」]+)」/.exec(daofa.content)?.[1] : undefined;
  // 标点不计入标签长度:「财星主导，印星辅助」这类并列双标签放行,真复合长标签仍拦截
  if (daofaTag && daofaTag.replace(/[，,·、\s]/g, "").length > 8) violations.push(`道法标签「${daofaTag}」超8字`);
  for (const section of Object.values(report.sections)) {
    for (const insight of section.insights) {
      const exclaim = (insight.content.match(/！/g) ?? []).length;
      if (exclaim > 2) violations.push(`${insight.label}感叹号${exclaim}个`);
      const limit = FIELD_CHAR_LIMITS[insight.label] ?? DEFAULT_FIELD_CHAR_LIMIT;
      if (insight.content.length > limit) violations.push(`${insight.label}${insight.content.length}字超限${limit}`);
      if (violations.length >= 3) return violations;
    }
  }
  return violations;
}

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
      insights: [{ label: "小节名", content: "完整解读段落" }],
      advice: ["建议"],
    }])),
    disclaimer: "免责声明(20字以上)：本报告基于传统命理文化，仅供自我观察参考，不构成科学预测或决策依据。",
  };
  return `请依据下面的八字排盘信息，按报告模版生成完整的《MeVerse 个人八字报告》。

【八字排盘信息】

${JSON.stringify(chartData, null, 1)}

${rhythm ? `【大运流年排盘】(模版的时间类小节以此为据，评分为引擎参考分，可自行细化断语；流年只覆盖 ${annualRange} 年，时间类小节逐年写到该区间为止，不要编造区间外年份)\n\n大运：${rhythm.dayun.join("、")}\n流年（${annualRange}）：${rhythm.annual.join("、")}\n\n` : ""}${TEMPLATE_SECTIONS}

${TEMPLATE_STYLE_RULES}

【输出 JSON 结构】(sections 是以九个章节 key 为字段的对象，不是数组；不要输出模板之外的任何字段)

${JSON.stringify(template, null, 1)}`;
}

export function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("STATIC_READING_NO_JSON");
  return text.slice(start, end + 1);
}

// 宽容剥离:AI 顺手塞进 insight 的多余字段按白名单丢弃,避免 strict 校验整体拒收。
export function sanitizeReportDraft(raw: unknown): unknown {
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

// 通用生成内核:模型直出 → JSON 提取 → 宽容剥离 → 结构校验 → 表达层校验,
// 任一环失败把纠错提示喂回模型重试(最多3轮/60s预算)。个人与双人报告共用。
export async function generateValidatedReport<T>(
  callModel: (system: string, prompt: string) => Promise<string>,
  options: {
    system: string;
    buildPrompt: (retrySuffix: string) => string;
    validate: (raw: unknown) => T;
    styleCheck?: (report: T) => string[];
  },
): Promise<T> {
  let lastError: unknown;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // 重试预算:单次上限 240s,总时长超 60s 就不再重试,保证 300s 函数预算内能落 failed 状态
    if (attempt > 0 && Date.now() - startedAt > 60_000) break;
    const suffix = attempt ? `\n\n上次输出未通过结构校验：${describeValidationError(lastError)}。请修正后重新输出完整 JSON。` : "";
    try {
      const text = await callModel(options.system, options.buildPrompt(suffix));
      const validated = options.validate(sanitizeReportDraft(JSON.parse(extractJson(text))));
      const styleViolations = options.styleCheck?.(validated) ?? [];
      if (styleViolations.length) throw new Error(`风格违规：${styleViolations.join("；")}`);
      return validated;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("GENERATION_INVALID");
}

export async function generateStaticReading(
  callModel: (system: string, prompt: string) => Promise<string>,
  facts: StaticReadingFacts,
  profile?: BaziLifeProfile,
  options?: { systemPrompt?: string; promptSuffix?: string },
) {
  return generateValidatedReport(callModel, {
    system: options?.systemPrompt ?? STATIC_READING_SYSTEM_PROMPT,
    buildPrompt: (retrySuffix) => buildStaticReadingPrompt(facts, profile) + (options?.promptSuffix ?? "") + retrySuffix,
    validate: validateStaticReading,
    styleCheck: checkStaticReadingStyle,
  });
}

export function isStaticReading(value: unknown): value is StaticReading {
  return staticReadingSchema.safeParse(value).success;
}
