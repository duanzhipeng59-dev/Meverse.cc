// AI 生辰画像解释层：只消费八字引擎的确定性排盘结果，不重复排盘。
import type { BaziChart, BaziDaYunStep } from "./myfate-bazi-engine";

type Element = "木" | "火" | "土" | "金" | "水";
type Tone = "good" | "neutral" | "caution";

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const GAN_WUXING: Record<string, Element> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const ZHI_WUXING: Record<string, Element> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
const SHENG: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const LIU_HE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const CHONG: Record<string, string> = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const HAI: Record<string, string> = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
const PO: Record<string, string> = { 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" };
const GAN_HE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
const ZHI_XING = new Set(["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯", "卯子", "辰辰", "午午", "酉酉", "亥亥"]);

const ELEMENT_NATURE: Record<Element, string> = {
  木: "生长、规划与仁厚", 火: "表达、热度与行动", 土: "稳定、承载与兑现", 金: "判断、边界与执行", 水: "洞察、流动与适应",
};
const ELEMENT_CARE: Record<Element, string> = {
  木: "传统命理把木对应到舒展与节律，适合规律作息、减少长期压抑",
  火: "传统命理把火对应到心神与活力，忙碌期更要留意休息和情绪降温",
  土: "传统命理把土对应到消化与稳定感，饮食规律比短期进补更重要",
  金: "传统命理把金对应到呼吸与边界，适合保持环境清爽并安排有氧活动",
  水: "传统命理把水对应到恢复与储备，避免持续透支，睡眠是重要补给",
};
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  比劫: ["自主", "同伴", "行动力"], 印星: ["学习", "直觉", "安全感"], 食伤: ["表达", "创作", "影响力"], 财星: ["资源", "现实", "经营力"], 官杀: ["责任", "规则", "成就感"],
};
const CATEGORY_READING: Record<string, string> = {
  比劫: "自我驱动力和同伴意识明显，适合在竞争或协作中建立位置；过旺时要避免固执与资源争夺。",
  印星: "吸收、思考与复盘能力突出，容易依赖熟悉的安全区；把理解转化为行动，优势才会落地。",
  食伤: "表达、创意和输出欲是重要天赋，适合用作品被看见；过旺时需留意情绪化表达。",
  财星: "对资源、效率和结果敏感，擅长把抽象目标变成现实成果；不要把关系也过度量化。",
  官杀: "责任感、目标感与抗压能力较强，在清晰规则中容易成长；压力过重时要避免自我苛责。",
};
const CAREER_BY_GOD: Record<string, string> = {
  比劫: "需要自主权、竞争感或团队号召力的角色", 印星: "研究、教育、策划、内容沉淀与专业支持型角色", 食伤: "创作、传播、表演、设计、产品与表达型角色", 财星: "经营、商业、项目管理、资源整合与结果导向型角色", 官杀: "管理、制度、专业服务、组织决策与高责任角色",
};
const WEALTH_BY_GOD: Record<string, string> = {
  比劫: "财富来自行动速度与人脉协作，但合伙和冲动开支需要清晰边界。", 印星: "更适合凭专业、资历和长期积累变现，慢就是快。", 食伤: "作品、流量、表达和差异化能力是主要变现入口。", 财星: "资源嗅觉和经营意识较强，适合让现金流和长期配置并行。", 官杀: "稳定职位、责任溢价和组织信用是财富的重要来源。",
};
const DAYUN_THEME: Record<string, string> = {
  比劫: "自主与竞争被放大，适合建立个人位置，也要管理合作边界。", 印星: "学习、沉淀与贵人支持增强，适合升级能力和修复状态。", 食伤: "创作与表达进入活跃期，作品和影响力更容易被看见。", 财星: "资源、合作和现实成果成为主线，适合经营与兑现。", 官杀: "责任与目标上升，事业结构可能重组，压力也会带来位置。",
};

function roleOfElement(el: Element, dayMaster: string): string {
  const day = GAN_WUXING[dayMaster];
  if (el === day) return "比劫";
  if (SHENG[day] === el) return "食伤";
  if (KE[day] === el) return "财星";
  if (KE[el] === day) return "官杀";
  return "印星";
}

function tenGod(day: string, other: string): string {
  const d = GAN_WUXING[day];
  const o = GAN_WUXING[other];
  const samePolarity = GAN.indexOf(day) % 2 === GAN.indexOf(other) % 2;
  if (d === o) return samePolarity ? "比肩" : "劫财";
  if (SHENG[d] === o) return samePolarity ? "食神" : "伤官";
  if (KE[d] === o) return samePolarity ? "偏财" : "正财";
  if (KE[o] === d) return samePolarity ? "七杀" : "正官";
  return samePolarity ? "偏印" : "正印";
}

function godCategory(god: string): string {
  if (god === "比肩" || god === "劫财") return "比劫";
  if (god === "食神" || god === "伤官") return "食伤";
  if (god === "正财" || god === "偏财") return "财星";
  if (god === "正官" || god === "七杀") return "官杀";
  return "印星";
}

function yearGanZhi(year: number): string {
  const index = ((year - 1984) % 60 + 60) % 60;
  return GAN[index % 10] + "子丑寅卯辰巳午未申酉戌亥"[index % 12];
}

function level(value: number, max: number) {
  if (value === max) return "主导";
  if (value >= 2) return "明显";
  if (value > 0) return "潜藏";
  return "不显";
}

export type BaziLifeProfile = {
  summary: {
    dayElement: Element;
    yinYang: string;
    season: string;
    strength: string;
    pattern: string;
    statement: string;
    favorable: Element[];
    cautious: Element[];
  };
  tenGods: Array<{ name: string; value: number; level: string; keywords: string[]; reading: string }>;
  relations: Array<{ title: string; text: string; tone: Tone }>;
  lifeStages: Array<{ label: string; scope: string; ganzhi: string; diShi: string; text: string }>;
  areas: {
    personality: { summary: string; details: string[] };
    talent: { summary: string; details: string[] };
    career: { summary: string; details: string[] };
    wealth: { summary: string; details: string[] };
    relationship: { summary: string; details: string[] };
    family: { summary: string; details: string[] };
    wellbeing: { summary: string; details: string[] };
  };
  dayun: Array<{ ganzhi: string; ageText: string; yearText: string; theme: string; tone: Tone; current: boolean }>;
  annual: Array<{ year: number; ganzhi: string; focus: string; score: number; text: string; tone: Tone }>;
  advice: string[];
};

function buildRelations(chart: BaziChart): BaziLifeProfile["relations"] {
  const result: BaziLifeProfile["relations"] = [];
  const labels = chart.pillars.map((pillar) => pillar.label);
  const stems = chart.pillars.map((pillar) => pillar.ganzhi[0]);
  const branches = chart.pillars.map((pillar) => pillar.ganzhi[1]);
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      if (GAN_HE[stems[i]] === stems[j]) result.push({ title: "天干相合", text: labels[i] + stems[i] + "与" + labels[j] + stems[j] + "相合，代表这两个生命领域之间容易互相牵引、彼此成全。", tone: "good" });
      if (LIU_HE[branches[i]] === branches[j]) result.push({ title: "地支六合", text: labels[i] + branches[i] + "与" + labels[j] + branches[j] + "六合，关系协同度高，相关事务更容易获得支持。", tone: "good" });
      if (CHONG[branches[i]] === branches[j]) result.push({ title: "地支相冲", text: labels[i] + branches[i] + "与" + labels[j] + branches[j] + "相冲，变化和拉扯感较强，也常成为推动转折的力量。", tone: "caution" });
      if (HAI[branches[i]] === branches[j]) result.push({ title: "地支相害", text: labels[i] + branches[i] + "与" + labels[j] + branches[j] + "相害，容易出现隐性消耗，沟通宜具体而直接。", tone: "caution" });
      if (PO[branches[i]] === branches[j]) result.push({ title: "地支相破", text: labels[i] + branches[i] + "与" + labels[j] + branches[j] + "相破，计划执行时容易被细节打断，适合预留弹性。", tone: "neutral" });
      if (ZHI_XING.has(branches[i] + branches[j])) result.push({ title: "地支相刑", text: labels[i] + branches[i] + "与" + labels[j] + branches[j] + "成刑，内在要求较高，压力需要有稳定出口。", tone: "caution" });
    }
  }
  return result.length ? result : [{ title: "结构平稳", text: "四柱之间没有明显的合冲刑害，命局内部拉扯较少，更多课题来自运势阶段而非先天结构。", tone: "neutral" }];
}

function dayunInsight(step: BaziDaYunStep, dayMaster: string, favorable: Element[], cautious: Element[]) {
  const stemEl = GAN_WUXING[step.ganzhi[0]];
  const branchEl = ZHI_WUXING[step.ganzhi[1]];
  const category = roleOfElement(stemEl, dayMaster);
  const helpful = favorable.includes(stemEl) || favorable.includes(branchEl);
  const taxing = cautious.includes(stemEl) && cautious.includes(branchEl);
  return {
    ganzhi: step.ganzhi,
    ageText: step.startAge + "–" + step.endAge + "岁",
    yearText: step.startYear + "–" + step.endYear,
    theme: DAYUN_THEME[category] + (helpful ? " 喜用力量到位，顺势投入更容易形成成果。" : taxing ? " 忌神力量偏重，宜控制节奏、先稳结构再扩张。" : " 吉凶取决于选择与环境，重在把握节奏。"),
    tone: (helpful ? "good" : taxing ? "caution" : "neutral") as Tone,
    current: step.current,
  };
}

export function buildBaziLifeProfile(chart: BaziChart, currentYear = new Date().getFullYear()): BaziLifeProfile {
  const dayMaster = chart.dayMaster;
  const dayElement = GAN_WUXING[dayMaster];
  const sealElement = (Object.keys(SHENG) as Element[]).find((element) => SHENG[element] === dayElement) as Element;
  const officerElement = (Object.keys(KE) as Element[]).find((element) => KE[element] === dayElement) as Element;
  const wealthElement = KE[dayElement];
  const outputElement = SHENG[dayElement];
  const monthBranch = chart.pillars[1].ganzhi[1];
  const monthElement = ZHI_WUXING[monthBranch];
  const support = chart.wuXing[dayElement] + chart.wuXing[sealElement] + (monthElement === dayElement || monthElement === sealElement ? 1 : 0);
  const strength = support >= 5 ? "身强" : support <= 2 ? "身弱" : "中和";
  const ordered = (Object.keys(chart.wuXing) as Element[]).sort((a, b) => chart.wuXing[a] - chart.wuXing[b]);
  const favorable = strength === "身强" ? [wealthElement, outputElement] : strength === "身弱" ? [sealElement, dayElement] : [ordered[0], ordered[1]];
  const cautious = strength === "身强" ? [dayElement, sealElement] : strength === "身弱" ? [officerElement, wealthElement] : [ordered[4]];

  const counts: Record<string, number> = { 比劫: 0, 印星: 0, 食伤: 0, 财星: 0, 官杀: 0 };
  for (const pillar of chart.pillars) {
    if (pillar.label !== "日柱") counts[godCategory(tenGod(dayMaster, pillar.ganzhi[0]))] += 1;
    for (const hidden of pillar.hideGan) counts[godCategory(tenGod(dayMaster, hidden))] += 0.5;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topGod = ranked[0][0];
  const secondGod = ranked[1][0];
  const maxGod = ranked[0][1];
  const tenGods = ranked.map(([name, value]) => ({ name, value, level: level(value, maxGod), keywords: CATEGORY_KEYWORDS[name], reading: CATEGORY_READING[name] }));

  const dominantElement = [...ordered].reverse()[0];
  const missingElements = ordered.filter((element) => chart.wuXing[element] === 0);
  const dayBranch = chart.pillars[2].ganzhi[1];
  const spouseElement = chart.gender === "female" ? officerElement : wealthElement;
  const spouseCategory = chart.gender === "female" ? "官杀" : "财星";
  const spouseCount = counts[spouseCategory];
  const relationText = spouseCount >= 2.5
    ? "配偶星在命局中较显，关系议题在人生中的存在感较强，既容易遇见，也更需要学会筛选。"
    : spouseCount > 0
      ? "配偶星有根但不过旺，感情更适合在稳定相处中逐步确认。"
      : "配偶星不显，关系通常不会按外界时间表发生，更看重阶段运势和真实契合。";

  const lifeStages = chart.pillars.map((pillar, index) => {
    const scope = ["原生环境与早年印记", "成长方式与事业底色", "核心自我与亲密关系", "内在愿景与后期发展"][index];
    const stageText = [
      "年柱反映早年环境、家族氛围与对外第一印象。",
      "月柱得月令，是判断格局强弱和社会能力的重要支点。",
      "日柱以日干为自己、日支为关系宫，是整张命盘的核心。",
      "时柱对应长远愿景、内心欲望与后期成果，也受出生时刻准确度影响。",
    ][index];
    return { label: pillar.label, scope, ganzhi: pillar.ganzhi, diShi: pillar.diShi, text: stageText + "十二长生落“" + pillar.diShi + "”，显示该领域的能量节奏。" };
  });

  const personalityDetails = [
    CATEGORY_READING[topGod],
    "日主" + dayMaster + "属" + dayElement + "，底层气质偏向" + ELEMENT_NATURE[dayElement] + "。",
    strength === "身强" ? "自我驱动力充足，适合承担和主导；成长点是给反馈与合作留位置。" : strength === "身弱" ? "感受力细密、善于借势；稳定环境和可靠团队能放大优势。" : "内外能量相对均衡，适应性强，关键在于建立长期主线。",
  ];
  const talentDetails = [
    topGod + "主导、" + secondGod + "辅助，天赋组合落在“" + CATEGORY_KEYWORDS[topGod].join("、") + "”与“" + CATEGORY_KEYWORDS[secondGod].join("、") + "”。",
    "五行中" + dominantElement + "气最显，" + ELEMENT_NATURE[dominantElement] + "会成为外界最容易看见的能力。",
    missingElements.length ? "命局中" + missingElements.join("、") + "不显，不等于缺点；更适合通过环境、伙伴和方法补足。" : "五行均有落点，能力结构较完整，适合做跨领域整合。",
  ];
  const careerSummary = "事业更适合“" + CAREER_BY_GOD[topGod] + "”，而不是长期停留在低反馈、低自主的消耗环境。";
  const careerDetails = [
    "月柱" + chart.pillars[1].ganzhi + "为事业底色，月干十神为" + chart.pillars[1].shiShenGan + "，说明社会角色往往从这类能力起步。",
    "喜用五行是" + favorable.join("、") + "，选择能强化" + favorable.map((element) => ELEMENT_NATURE[element]).join("与") + "的团队与项目更顺势。",
    "官杀力量为“" + level(counts.官杀, maxGod) + "”，" + (counts.官杀 >= 2 ? "对目标和责任并不回避，适合逐步承担更大影响范围。" : "比起头衔，更需要通过真实成果建立位置。"),
  ];
  const wealthSummary = WEALTH_BY_GOD[topGod];
  const wealthDetails = [
    "财星五行为" + wealthElement + "，命局财星权重约" + counts.财星.toFixed(1) + "，属于“" + level(counts.财星, maxGod) + "”。",
    favorable.includes(wealthElement) ? "财星属于喜用，资源与成果容易反过来增强状态，适合建立长期复利。" : cautious.includes(wealthElement) ? "财星属于需要节制的力量，机会增多时也要管理透支、承诺和现金流压力。" : "财星作用中性，财富表现更依赖所处大运与执行方式。",
    "比劫权重约" + counts.比劫.toFixed(1) + "；比劫偏旺时，合伙、借贷和人情支出更需要事先定规则。",
  ];
  const familyDetails = [
    "年柱" + chart.pillars[0].ganzhi + "承载原生环境印记，纳音为" + chart.pillars[0].naYin + "。",
    "月柱" + chart.pillars[1].ganzhi + "连接成长环境与社会规则，藏干为" + chart.pillars[1].hideGan.join("、") + "。",
    "印星权重约" + counts.印星.toFixed(1) + "，" + (counts.印星 >= 2 ? "安全感和长辈影响较深，成长中要逐步形成自己的判断。" : "更习惯靠亲身经验建立安全感，独立性通常发展得较早。"),
  ];
  const wellbeingDetails = [
    ELEMENT_CARE[dominantElement] + "。",
    missingElements.length ? ELEMENT_CARE[missingElements[0]] + "；这是传统五行生活提示，不等同于医学诊断。" : "五行分布完整，保持稳定睡眠、饮食与运动，比追求单一“补五行”更重要。",
    cautious.map((element) => element + "气过旺时易表现为" + ELEMENT_NATURE[element] + "失衡").join("；") + "。",
  ];

  const annual = Array.from({ length: 10 }, (_, index) => {
    const year = currentYear + index;
    const ganzhi = yearGanZhi(year);
    const stemElement = GAN_WUXING[ganzhi[0]];
    const branchElement = ZHI_WUXING[ganzhi[1]];
    const category = roleOfElement(stemElement, dayMaster);
    let score = 60;
    if (favorable.includes(stemElement)) score += 12;
    if (favorable.includes(branchElement)) score += 8;
    if (cautious.includes(stemElement)) score -= 10;
    if (cautious.includes(branchElement)) score -= 7;
    if (CHONG[ganzhi[1]] === dayBranch) score -= 9;
    if (LIU_HE[ganzhi[1]] === dayBranch) score += 7;
    score = Math.max(35, Math.min(88, score));
    const tone: Tone = score >= 70 ? "good" : score < 52 ? "caution" : "neutral";
    const relationSignal = CHONG[ganzhi[1]] === dayBranch ? "同时冲动日支，关系与居住节奏可能出现调整。" : LIU_HE[ganzhi[1]] === dayBranch ? "同时合入日支，合作与关系更容易推进。" : "整体以该年主气为核心，宜按节奏推进。";
    return { year, ganzhi, focus: category, score, text: DAYUN_THEME[category] + " " + relationSignal, tone };
  });

  return {
    summary: {
      dayElement,
      yinYang: GAN.indexOf(dayMaster) % 2 === 0 ? "阳" : "阴",
      season: monthBranch + "月（" + monthElement + "旺之令）",
      strength,
      pattern: topGod + "主导 · " + secondGod + "辅助",
      statement: dayMaster + dayElement + "日主生于" + monthBranch + "月，命局" + strength + "。核心课题是把" + CATEGORY_KEYWORDS[topGod].join("、") + "转化成可持续的生活与成果。",
      favorable,
      cautious,
    },
    tenGods,
    relations: buildRelations(chart),
    lifeStages,
    areas: {
      personality: { summary: "外在由" + topGod + "驱动，内在以" + secondGod + "调节；真正的优势来自两者配合。", details: personalityDetails },
      talent: { summary: "最值得发展的不是单点能力，而是“" + CATEGORY_KEYWORDS[topGod][0] + " × " + CATEGORY_KEYWORDS[secondGod][0] + "”的组合能力。", details: talentDetails },
      career: { summary: careerSummary, details: careerDetails },
      wealth: { summary: wealthSummary, details: wealthDetails },
      relationship: { summary: relationText, details: ["配偶星属" + spouseElement + "，关系里更容易被具有" + ELEMENT_NATURE[spouseElement] + "特质的人吸引。", "夫妻宫坐" + dayBranch + "，藏干" + chart.pillars[2].hideGan.join("、") + "，亲密关系会触发" + chart.pillars[2].hideShiShen.join("、") + "等内在需求。", "关系质量不只看配偶星，还要结合夫妻宫、大运和流年共同判断。"] },
      family: { summary: "家庭影响主要从年柱与月柱进入，既塑造安全感，也塑造面对规则与责任的方式。", details: familyDetails },
      wellbeing: { summary: "五行最需要关注的是长期失衡，而不是机械地“缺什么补什么”。", details: wellbeingDetails },
    },
    dayun: chart.daYun.steps.map((step) => dayunInsight(step, dayMaster, favorable, cautious)),
    annual,
    advice: [
      "优先发展" + favorable.join("、") + "所代表的环境与能力，让喜用力量在现实中有落点。",
      "当" + cautious.join("、") + "相关压力明显时，减少同时推进的目标，先恢复节奏再做扩张。",
      "把" + topGod + "的优势用于长期作品或稳定关系，避免只在短期情绪里消耗。",
      "出生时辰会影响时柱、起运和部分细节；若目前时辰为近似值，应把具体年份判断视为趋势参考。",
    ],
  };
}
