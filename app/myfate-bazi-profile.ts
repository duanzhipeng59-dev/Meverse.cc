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
// ── 大运/流年差异化文案池(引擎事实驱动,候选按年确定性轮转+相邻去重) ──
const DAYUN_KEYWORD: Record<string, string[]> = {
  比劫: ["建立位置", "独立扩张", "竞合生长"], 印星: ["能力升级", "蓄力沉淀", "借力修复"], 食伤: ["表达破圈", "作品立身", "灵感变现"], 财星: ["经营兑现", "资源整合", "务实落地"], 官杀: ["责任扩张", "结构重塑", "压力淬炼"],
};
const DAYUN_FOCUS: Record<string, Array<{ label: string; text: string }>> = {
  比劫: [{ label: "事业", text: "适合争取主导权和可见度，但合伙分工要提前定规则" }, { label: "财富", text: "收入与个人投入强相关，防冲动开支与担保借贷" }, { label: "身心", text: "能量足但易过载，规律训练比冲刺更重要" }],
  印星: [{ label: "学习", text: "系统学习与资格积累的窗口期，知识复利明显" }, { label: "事业", text: "适合后台支持、研究策划类角色，贵人在师长与上级" }, { label: "身心", text: "休整与恢复效率高，注意别退回舒适区不出发" }],
  食伤: [{ label: "事业", text: "创作、传播与产品能力被放大，适合用作品说话" }, { label: "关系", text: "表达欲增强，魅力上升，也要避免情绪化输出" }, { label: "财富", text: "流量与才华变现的入口打开，宜专注一两条主线" }],
  财星: [{ label: "财富", text: "经营意识与现金流机会增强，适合把想法变成产品" }, { label: "事业", text: "商务、合作与结果导向的角色更容易出成绩" }, { label: "关系", text: "现实议题进入关系，共同规划比浪漫更重要" }],
  官杀: [{ label: "事业", text: "职责、考核与影响范围上升，是建立职业壁垒的十年" }, { label: "身心", text: "压力管理系统化：睡眠、运动与情绪出口都要安排" }, { label: "财富", text: "职位与信用溢价是主要来源，慎加杠杆" }],
};
const DAYUN_ADVICE: Record<string, string[]> = {
  比劫: ["把年度目标拆到季度，先赢一场小的再谈扩张，合作一律先定退出机制。", "每季度留一个月只做核心目标，砍掉搭便车型合作。"],
  印星: ["选一个两年内能拿下的资质或体系课程，把学习产出沉淀成可展示的成果。", "为深造留出固定时间块，学完立刻找一个小场景实践。"],
  食伤: ["选定一个对外表达的主阵地，按周稳定输出，让作品替你积累信用。", "把灵感记录成素材库，每季度完成一件完整作品而不是十个开头。"],
  财星: ["为现金流设两条纪律：大额支出冷静期与合作分账书面化。", "每年做一次资产盘点，把资源投向能复利的一两处。"],
  官杀: ["用书面计划管理承诺：每接受一项新职责，就同步砍掉一件旧事务。", "建立季度复盘机制，把压力翻译成可执行的里程碑。"],
};
const ANNUAL_KEYWORD: Record<string, string[]> = {
  比劫: ["自立门户", "并肩行事", "竞合之年"], 印星: ["蓄力沉淀", "进修蓄能", "贵人指路"], 食伤: ["表达破圈", "作品面世", "灵感落地"], 财星: ["务实经营", "资源落袋", "变现之年"], 官杀: ["责任上肩", "规则重塑", "压力淬炼"],
};
const ANNUAL_OPPORTUNITY: Record<string, string[]> = {
  比劫: ["适合主动牵头做一件事，你的行动速度就是今年的竞争力。", "适合召集同伴共同推进目标，人脉会在协作中变成资产。", "适合拿回一件事的主导权，按自己的方式做一遍。"],
  印星: ["适合系统学习或考取资质，今年吸收的会成为明年的筹码。", "适合主动请教前辈与专业人士，关键指点能少走弯路。", "适合整理方法论，把零散经验沉淀成体系。"],
  食伤: ["适合公开发表作品与观点，被看见本身就是机会。", "适合启动创作型项目，灵感密度比平时更高。", "适合做内容、产品或提案，差异化表达是突破口。"],
  财星: ["适合推进合作与谈判，资源向你倾斜的概率上升。", "适合把想法做成可交易的东西，现金流会给出反馈。", "适合盘点与优化现有资源结构，减法也是收益。"],
  官杀: ["适合争取更明确的职责与头衔，位置比舒适更重要。", "适合在规则与考核中胜出，专业度会被放大检视。", "适合接下有挑战的任务，压力正是建立信誉的通道。"],
};
const ANNUAL_WATCH: Record<string, string[]> = {
  比劫: ["留意合伙与分账边界，口头承诺今年更容易留下隐患。", "留意冲动决策，重要决定给自己 48 小时冷静期。", "留意资源争夺引发的摩擦，先小人后君子更稳妥。"],
  印星: ["留意想得多做得少，学完的东西要尽快落地验证。", "留意对安全区的依赖，舒适但不成长的事要设期限。", "留意信息过载，输入要有筛选标准。"],
  食伤: ["留意表达过载，情绪上头时先草稿后发送。", "留意兴趣发散，同时开工太多会稀释成果。", "留意对反馈过度敏感，作品要经得起批评。"],
  财星: ["留意透支与杠杆，机会越多越要守住现金流底线。", "留意把关系过度量化，合作需要留人情余地。", "留意账期与合同细节，书面化是自我保护。"],
  官杀: ["留意多头承诺同时压身，接新事前先减旧事。", "留意自我苛责，考核之外还要有自己的评价标准。", "留意睡眠与情绪张力，压力需要稳定出口。"],
};
const SIGNAL_NOTE: Record<string, string> = {
  chong_day: "与日支相冲", he_day: "与日支六合", chong_month: "与月支相冲", he_month: "与月支六合",
  chong_dayun: "与大运支相冲", he_dayun: "与大运支相合", gan_he: "天干与日主相合", xing: "与命局成刑", hai: "与命局相害", po: "与命局相破",
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
  dayun: Array<{
    ganzhi: string; ageText: string; yearText: string; tone: Tone; current: boolean;
    keyword: string; theme: string; basis: string[]; focus: Array<{ label: string; text: string }>; advice: string;
  }>;
  annual: Array<{
    year: number; ganzhi: string; focus: string; score: number; tone: Tone;
    keyword: string; theme: string; basis: string[]; opportunity: string; watch: string; advice: string; text: string;
    continuation: boolean; dayunGanzhi: string; dayunRange: string; dayunShift: null | { year: number; from: string; to: string; note: string };
  }>;
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

function dayunInsight(step: BaziDaYunStep, dayMaster: string, favorable: Element[], cautious: Element[], index: number, branches: string[]) {
  const stemEl = GAN_WUXING[step.ganzhi[0]];
  const branchEl = ZHI_WUXING[step.ganzhi[1]];
  const stemGod = tenGod(dayMaster, step.ganzhi[0]);
  const branchGod = tenGod(dayMaster, step.ganzhi[1]);
  const category = roleOfElement(stemEl, dayMaster);
  const helpful = favorable.includes(stemEl) || favorable.includes(branchEl);
  const taxing = cautious.includes(stemEl) && cautious.includes(branchEl);
  const basis: string[] = [
    `大运天干 ${step.ganzhi[0]} 属${stemEl}，为日主${stemGod}；大运支 ${step.ganzhi[1]} 属${branchEl}，为${branchGod}。`,
  ];
  if (CHONG[step.ganzhi[1]] === branches[2]) basis.push(`大运支与日支(${branches[2]})相冲，这一阶段关系与自我定位的调整感更强。`);
  else if (LIU_HE[step.ganzhi[1]] === branches[2]) basis.push(`大运支与日支(${branches[2]})六合，内在状态与外部机会容易相互配合。`);
  else if (GAN_HE[step.ganzhi[0]] === dayMaster) basis.push(`大运天干与日干相合，外部力量会主动牵引个人方向。`);
  basis.push(helpful ? `${stemEl}${branchEl}之气落在喜用(${favorable.join("、")})一方，阶段力量与原局需求同向。` : taxing ? `${stemEl}${branchEl}之气偏向需节制的一方(${cautious.join("、")})，扩张要更谨慎。` : `喜忌参半，阶段表现很大程度取决于具体选择与环境。`);
  const keyword = DAYUN_KEYWORD[category][(index + (helpful ? 0 : 1)) % DAYUN_KEYWORD[category].length];
  const focus = DAYUN_FOCUS[category].slice(0, helpful || taxing ? 3 : 2);
  const advice = DAYUN_ADVICE[category][(index + (taxing ? 1 : 0)) % DAYUN_ADVICE[category].length];
  const theme = DAYUN_THEME[category] + (helpful ? "喜用力量到位，顺势投入更容易形成成果。" : taxing ? "忌神力量偏重，宜先稳结构再扩张。" : "吉凶取决于选择与环境，重在把握节奏。");
  return {
    ganzhi: step.ganzhi,
    ageText: step.startAge + "–" + step.endAge + "岁",
    yearText: step.startYear + "–" + step.endYear,
    keyword, theme, basis, focus, advice,
    tone: (helpful ? "good" : taxing ? "caution" : "neutral") as Tone,
    current: step.current,
  };
}

// 字符二元组相似度:粗粒度查重(确定性文案无需精确算法)
function textSimilarity(a: string, b: string) {
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
    return set;
  };
  const left = bigrams(a), right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const gram of left) if (right.has(gram)) hit += 1;
  return hit / Math.min(left.size, right.size);
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

  const branches = chart.pillars.map((pillar) => pillar.ganzhi[1]);
  const dayunSteps = chart.daYun.steps;
  const annual = Array.from({ length: 10 }, (_, index) => {
    const year = currentYear + index;
    const ganzhi = yearGanZhi(year);
    const stemElement = GAN_WUXING[ganzhi[0]];
    const branchElement = ZHI_WUXING[ganzhi[1]];
    const stemGod = tenGod(dayMaster, ganzhi[0]);
    const category = roleOfElement(stemElement, dayMaster);
    // 该年所属大运(未来十年可能跨步)
    const step = dayunSteps.find((item) => year >= item.startYear && year <= item.endYear) ?? dayunSteps.find((item) => item.current) ?? dayunSteps[0];
    const stepIndex = dayunSteps.indexOf(step);
    const prevStep = stepIndex > 0 ? dayunSteps[stepIndex - 1] : null;
    const dayunShift = prevStep && year === step.startYear
      ? { year, from: prevStep.ganzhi, to: step.ganzhi, note: `长期主题由「${DAYUN_KEYWORD[roleOfElement(GAN_WUXING[prevStep.ganzhi[0]], dayMaster)][0]}」转向「${DAYUN_KEYWORD[roleOfElement(GAN_WUXING[step.ganzhi[0]], dayMaster)][0]}」。` }
      : null;

    let score = 60;
    if (favorable.includes(stemElement)) score += 12;
    if (favorable.includes(branchElement)) score += 8;
    if (cautious.includes(stemElement)) score -= 10;
    if (cautious.includes(branchElement)) score -= 7;
    const signals: string[] = [];
    if (CHONG[ganzhi[1]] === branches[2]) { score -= 9; signals.push("chong_day"); }
    if (LIU_HE[ganzhi[1]] === branches[2]) { score += 7; signals.push("he_day"); }
    if (CHONG[ganzhi[1]] === branches[1]) { score -= 4; signals.push("chong_month"); }
    if (LIU_HE[ganzhi[1]] === branches[1]) { score += 4; signals.push("he_month"); }
    if (step && CHONG[ganzhi[1]] === step.ganzhi[1]) { score -= 5; signals.push("chong_dayun"); }
    if (step && LIU_HE[ganzhi[1]] === step.ganzhi[1]) { score += 5; signals.push("he_dayun"); }
    if (GAN_HE[ganzhi[0]] === dayMaster) { score += 3; signals.push("gan_he"); }
    if (ZHI_XING.has(ganzhi[1] + branches[2]) || ZHI_XING.has(branches[2] + ganzhi[1])) { score -= 3; signals.push("xing"); }
    if (HAI[ganzhi[1]] === branches[2]) { score -= 2; signals.push("hai"); }
    score = Math.max(38, Math.min(88, score));
    const tone: Tone = score >= 70 ? "good" : score < 50 ? "caution" : "neutral";
    return {
      year, ganzhi, focus: category, stemElement, branchElement, stemGod, category, score, tone, signals,
      step, dayunShift,
      branchGod: tenGod(dayMaster, ganzhi[1]),
    };
  }).map((row, index, rows) => {
    const { signals, step, dayunShift, stemElement, branchElement, stemGod, branchGod, ...rest } = row;
    const { year, ganzhi, category, score, tone } = rest;
    // 命理依据:干支十神 + 与原局/大运的实际关系,逐年组合唯一
    const basis: string[] = [`流年天干 ${ganzhi[0]} 属${stemElement}，为日主${stemGod}；流年支 ${ganzhi[1]} 属${branchElement}，主气为${branchGod}。`];
    for (const signal of signals) {
      const note = SIGNAL_NOTE[signal];
      if (signal === "chong_day") basis.push(`流年支与日支(${branches[2]})相冲，${year}年的变化感会集中体现在自我定位与亲密关系上。`);
      else if (signal === "he_day") basis.push(`流年支与日支(${branches[2]})六合，合作与关系议题更容易顺水推进。`);
      else if (signal === "chong_month") basis.push(`流年支与月支(${branches[1]})相冲，工作节奏或团队环境可能出现调整。`);
      else if (signal === "he_month") basis.push(`流年支与月支(${branches[1]})六合，平台与上级的支持面更顺。`);
      else if (signal === "chong_dayun") basis.push(`流年支与${step.ganzhi}大运相冲，短期节奏与十年主线方向有拉扯。`);
      else if (signal === "he_dayun") basis.push(`流年支与${step.ganzhi}大运相合，年度机会与长期主线相互成就。`);
      else if (signal === "gan_he") basis.push(`流年天干${ganzhi[0]}与日干${dayMaster}相合，外部资源主动靠近。`);
      else if (note) basis.push(`${note}，细节消耗需要预留弹性。`);
    }
    if (!signals.length) basis.push(`与原局四支柱支没有形成明显合冲，${year}年整体延续当前大运主题，以${DAYUN_KEYWORD[category][0]}的既有节奏展开。`);

    // 与上一年比较:同类同信号 → 明确写"延续"
    const prev = rows[index - 1];
    const continuation = Boolean(prev && prev.category === category && prev.tone === tone && prev.signals.join() === signals.join());
    const rotation = (year + category.length) % 3;
    const keyword = ANNUAL_KEYWORD[category][rotation % ANNUAL_KEYWORD[category].length];
    const opportunity = ANNUAL_OPPORTUNITY[category][(rotation + (tone === "caution" ? 1 : 0)) % ANNUAL_OPPORTUNITY[category].length];
    const watch = ANNUAL_WATCH[category][(rotation + 1) % ANNUAL_WATCH[category].length];
    const theme = continuation
      ? `延续上年「${ANNUAL_KEYWORD[category][((year - 1 + category.length) % 3) % ANNUAL_KEYWORD[category].length]}」的主题，${signals.length ? `新增变化来自${signals.map((s) => SIGNAL_NOTE[s]).join("、")}。` : "结构上没有新的强信号，重在执行深度。"}`
      : `${ganzhi}年${category}主事，${signals.length ? `关键信号是${signals.map((s) => SIGNAL_NOTE[s]).join("、")}。` : "没有与原局形成强互动，以大运背景下的常规节奏为主。"}`;
    const adviceTail = score >= 70 ? "适合把资源集中在最重要的目标上。" : score < 50 ? "适合控制变量、少做加法，先稳住基本盘。" : "适合按既定节奏推进，不必激进也不必收缩。";
    const advice = `${DAYUN_ADVICE[category][rotation % DAYUN_ADVICE[category].length]}${adviceTail}`;
    const text = theme + " 机会：" + opportunity + " 留意：" + watch;
    return {
      ...rest, keyword, theme, basis, opportunity, watch, advice, text, continuation,
      dayunGanzhi: step.ganzhi,
      dayunRange: step.startYear + "–" + step.endYear,
      dayunShift,
    };
  });

  // 相邻去重:正文相似度>70% 或 关键词+建议相同 → 轮换候选;仍近则标记延续
  for (let i = 1; i < annual.length; i += 1) {
    const prev = annual[i - 1], cur = annual[i];
    const bodyA = cur.theme + cur.opportunity + cur.watch + cur.advice;
    const bodyB = prev.theme + prev.opportunity + prev.watch + prev.advice;
    if (textSimilarity(bodyA, bodyB) > 0.7 || (cur.keyword === prev.keyword && cur.advice === prev.advice)) {
      const pool = ANNUAL_OPPORTUNITY[cur.focus];
      cur.opportunity = pool[(pool.indexOf(cur.opportunity) + 1) % pool.length];
      const watchPool = ANNUAL_WATCH[cur.focus];
      cur.watch = watchPool[(watchPool.indexOf(cur.watch) + 1) % watchPool.length];
      const keyPool = ANNUAL_KEYWORD[cur.focus];
      cur.keyword = keyPool[(keyPool.indexOf(cur.keyword) + 1) % keyPool.length];
      if (cur.category === prev.category && cur.focus === prev.focus && !cur.theme.startsWith("延续")) {
        cur.theme = cur.tone === prev.tone ? `延续上年「${prev.keyword}」的主题，力量结构相近，差异主要在执行重点。` : `延续上年「${prev.keyword}」的主题，节奏由${prev.tone === "good" ? "顺势" : prev.tone === "caution" ? "调整" : "平稳"}转向${cur.tone === "good" ? "顺势" : cur.tone === "caution" ? "调整" : "平稳"}。`;
      }
    }
  }

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
    dayun: chart.daYun.steps.map((step, index) => dayunInsight(step, dayMaster, favorable, cautious, index, branches)),
    annual,
    advice: [
      "优先发展" + favorable.join("、") + "所代表的环境与能力，让喜用力量在现实中有落点。",
      "当" + cautious.join("、") + "相关压力明显时，减少同时推进的目标，先恢复节奏再做扩张。",
      "把" + topGod + "的优势用于长期作品或稳定关系，避免只在短期情绪里消耗。",
      "出生时辰会影响时柱、起运和部分细节；若目前时辰为近似值，应把具体年份判断视为趋势参考。",
    ],
  };
}
