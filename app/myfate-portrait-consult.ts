// 现代实战派咨询师结构层:把八字引擎事实翻译成商业化咨询模块。
// 纯确定性模板,不引入玄学宿命断语;百分比与评分为结构信号的量化表达。
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";
import type { StarBaziReport } from "./myfate-star-bazi-report";

type Element = "木" | "火" | "土" | "金" | "水";
const GAN_WUXING: Record<string, Element> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const ZHI_WUXING: Record<string, Element> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
const ZHI_HIDDEN: Record<string, string> = { 子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙", 午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬" };
const TAO_HUA: Record<string, string> = { 寅: "卯", 午: "卯", 戌: "卯", 申: "酉", 子: "酉", 辰: "酉", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" };
const YI_MA: Record<string, string> = { 寅: "申", 午: "申", 戌: "申", 申: "寅", 子: "寅", 辰: "寅", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };
const YANG_REN: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

const DAO_FA: Record<string, string> = {
  "印星|财星": "印配财", "财星|印星": "财配印",
  "食伤|财星": "伤官生财", "财星|食伤": "食伤生财",
  "食伤|官杀": "食神制杀", "官杀|食伤": "制杀留权",
  "官杀|印星": "杀印相生", "印星|官杀": "官印双清",
  "比劫|财星": "比劫分财", "财星|比劫": "身财博弈",
  "比劫|官杀": "以身担杀", "官杀|比劫": "权压群雄",
  "比劫|食伤": "比劫泄秀", "食伤|比劫": "同伴输出",
  "印星|食伤": "印护表达", "食伤|印星": "才思泉涌",
  "印星|比劫": "印比扶身", "比劫|印星": "双力护身",
  "财星|官杀": "财生官旺", "官杀|财星": "以财买权",
};
const DAO_EXPLAIN: Record<string, string> = {
  印配财: "知识换资产:靠专业积累撬动现实资源,学以致用是财富放大器",
  伤官生财: "才华变现:创意与表达直接导向收入,作品就是生产资料",
  食神制杀: "以柔克刚:用专业能力和作品化解高压,越有挑战越出成绩",
  杀印相生: "压力转学历:外界压力最终转化为资历与话语权,适合大平台",
  比劫分财: "人力杠杆:靠团队与人脉做大蛋糕,但要先学会分蛋糕",
  以身担杀: "硬扛型选手:责任心扛出来位置,注意别把身体扛进去",
  比劫泄秀: "行动派创作者:想到就做、做了就说,适合快速迭代的环境",
  印护表达: "有底蕴的输出:先有体系再有观点,适合深度内容赛道",
  印比扶身: "双引擎护体:学习力加行动力,底盘极稳",
  财生官旺: "资源换位置:用实绩和资本换取组织里的上升通道",
};

const MAJORS: Record<string, string[]> = {
  比劫: ["体育与竞技管理", "创业与工商管理", "军事/警务与公共管理"],
  印星: ["研究型学科(数理/文史)", "教育与心理", "医学与生命科学"],
  食伤: ["设计与艺术", "传媒与内容创作", "计算机与产品创新"],
  财星: ["金融与投资", "商业运营与市场营销", "供应链与实业管理"],
  官杀: ["法律与公共管理", "工程与项目管理", "临床医学与高门槛执业"],
};

const ORGAN: Record<Element, string> = {
  木: "肝胆与筋络(熬夜和久坐是硬伤,需要规律拉伸)",
  火: "心血管与眼睛(高压期留意心率和睡眠质量)",
  土: "脾胃与消化(饮食不规律最先报警)",
  金: "肺与呼吸道(环境清爽、有氧运动是刚需)",
  水: "肾与泌尿系统(熬夜透支最先吃亏,睡眠是第一补品)",
};

const GOD_DESC: Record<string, string> = {
  比劫: "同伴与竞争的力量", 印星: "学习与被保护的力量", 食伤: "表达与创造的力量", 财星: "资源与务实的力量", 官杀: "责任与规则的力量",
};

function yearGanZhi(year: number) {
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const index = ((year - 1984) % 60 + 60) % 60;
  return GAN[index % 10] + "子丑寅卯辰巳午未申酉戌亥"[index % 12];
}

export type ConsultReport = ReturnType<typeof buildConsultReport>;

// 人生运势曲线:7-80 岁逐年趋势(由大运打分插值+确定性微波动生成)
// 人生运势:以"人生阶段"为单位的趋势叙事(每段大运一个阶段),前端再平滑插值成曲线。
// 阶段趋势由相邻大运分差判定,避免逐岁随机波动造成的"心电图"观感。
export type FortuneStage = {
  startAge: number;
  endAge: number;
  score: number;
  trend: "up" | "steady" | "down";
  label: string;
};

export type FortuneStageSet = Record<"overview" | "career" | "wealth" | "love", FortuneStage[]>;

const FORTUNE_KEYWORDS: Record<string, string> = {
  up: "突破 · 扩张 · 收获",
  steady: "积累 · 节奏 · 沉淀",
  down: "防守 · 整理 · 蓄力",
};

function parseAgeMid(ageText: string) {
  const match = ageText.match(/(\d+)–(\d+)/);
  return match ? Math.round((Number(match[1]) + Number(match[2])) / 2) : 40;
}

// 输入:事业大运打分 / 财富大运趋势 / 感情大运标签 → 输出四个维度的阶段序列
export function buildFortuneStages(inputs: {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
}): FortuneStageSet {
  const TREND_SCORE: Record<string, number> = { "强劲 ↑↑": 85, "向好 ↑": 72, "平稳 →": 60, "承压 ↓": 48 };
  const LOVE_SCORE: Record<string, number> = { 婚恋窗口: 85, 平稳期: 55, 动荡期: 42 };

  function toStages(items: Array<{ age: string; value: number }>): FortuneStage[] {
    return items.map((item, index) => {
      const match = item.age.match(/(\d+)–(\d+)/);
      const startAge = match ? Math.max(7, Number(match[1])) : 7;
      const endAge = match ? Math.min(80, Number(match[2])) : 80;
      const prev = index > 0 ? items[index - 1].value : item.value;
      const diff = item.value - prev;
      const trend: "up" | "steady" | "down" = diff >= 8 ? "up" : diff <= -8 ? "down" : "steady";
      return { startAge, endAge, score: item.value, trend, label: trend === "up" ? "上升期" : trend === "down" ? "回落期" : "平稳期" };
    });
  }

  const careerItems = inputs.careerLifetime.map((item) => ({ age: item.age, value: item.score }));
  const wealthItems = inputs.wealthLifetime.map((item) => ({ age: item.age, value: TREND_SCORE[item.trend] ?? 60 }));
  const loveItems = inputs.loveMarriage.map((item) => ({ age: item.age, value: LOVE_SCORE[item.tag] ?? 55 }));

  const career = toStages(careerItems);
  const wealth = toStages(wealthItems);
  const love = toStages(loveItems);

  // 总览:阶段边界取事业(主轴),分数为三维度加权
  const overview = career.map((stage, index) => {
    const wealthMatch = wealth.find((w) => w.startAge === stage.startAge) ?? wealth[ wealth.length - 1 ];
    const loveMatch = love.find((l) => l.startAge === stage.startAge) ?? love[ love.length - 1 ];
    const score = Math.round(stage.score * 0.4 + (wealthMatch?.score ?? 60) * 0.35 + (loveMatch?.score ?? 55) * 0.25);
    const prevScore = index > 0 ? Math.round(career[index - 1].score * 0.4 + (wealth.find((w) => w.startAge === career[index - 1].startAge)?.score ?? 60) * 0.35 + (love.find((l) => l.startAge === career[index - 1].startAge)?.score ?? 55) * 0.25) : score;
    const diff = score - prevScore;
    const trend: "up" | "steady" | "down" = diff >= 6 ? "up" : diff <= -6 ? "down" : "steady";
    return { ...stage, score, trend, label: trend === "up" ? "上升期" : trend === "down" ? "回落期" : "平稳期" };
  });

  return { overview, career, wealth, love };
}

// 阶段序列 → 7-80 岁逐岁采样(阶段内平滑过渡,不做随机波动)
export function sampleFortuneStages(stages: FortuneStage[]): Array<{ age: number; score: number; trend: "up" | "steady" | "down"; label: string }> {
  const points: Array<{ age: number; score: number; trend: "up" | "steady" | "down"; label: string }> = [];
  if (!stages.length) return points;
  for (let age = 7; age <= 80; age += 1) {
    const stage = stages.find((s) => age >= s.startAge && age <= s.endAge) ?? (age < stages[0].startAge ? stages[0] : stages[stages.length - 1]);
    points.push({ age, score: stage.score, trend: stage.trend, label: stage.label });
  }
  return points;
}

// 文档型章节:重点词由结构化字段提供,前端不做字符串猜测
export type RichParagraph = { content: string; highlights: string[] };
export type LabeledParagraph = { label: string; content: string };

export function buildConsultReport(chart: BaziChart, profile: BaziLifeProfile, report: StarBaziReport, currentYear = new Date().getFullYear()) {
  const dayMaster = chart.dayMaster;
  const dayEl = GAN_WUXING[dayMaster];
  const ranked = profile.tenGods;
  const topGod = ranked[0].name;
  const secondGod = ranked[1].name;
  const favorable = profile.summary.favorable;
  const cautious = profile.summary.cautious;
  const allZhi = chart.pillars.map((p) => p.ganzhi[1]);
  const monthZhi = allZhi[1];
  const dayZhi = allZhi[2];

  // ── 道法 ──
  const daoKey = DAO_FA[`${topGod}|${secondGod}`] ?? DAO_FA[`${secondGod}|${topGod}`] ?? "";
  const daoName = daoKey || (topGod === "印星" ? "印格取贵" : topGod === "财星" ? "财格成局" : topGod === "官杀" ? "官杀立格" : topGod === "食伤" ? "食伤泄秀" : "建禄自强");
  const daoExplain = DAO_EXPLAIN[daoKey] ?? "把主导力量做成个人品牌,是这条命盘的商业主线";

  // ── 神煞 ──
  const yiMaZhi = YI_MA[monthZhi];
  const hasYiMa = allZhi.some((z) => z === yiMaZhi);
  const taoHuaZhi = TAO_HUA[dayZhi];
  const hasTaoHua = allZhi.some((z) => z === taoHuaZhi);
  const yangRenZhi = YANG_REN[dayMaster];
  const hasYangRen = allZhi.some((z) => z === yangRenZhi);
  const guiRenPos = chart.pillars.findIndex((p) => p.hideGan.length >= 2);

  // ── 学业 ──
  const sealWeight = profile.tenGods.find((g) => g.name === "印星")?.value ?? 0;
  const degree = sealWeight >= 2.5 ? "较高(重点本科至硕士概率大)" : sealWeight >= 1.5 ? "中等偏上(本科为主,深造看大运)" : sealWeight >= 0.5 ? "中等(本科可期,实践型更强)" : "实践型(学历不是主战场,证书与手艺更值钱)";
  const examGoodYears: number[] = [];
  const examBadYears: number[] = [];
  for (const year of profile.annual) {
    if (year.focus === "印星") examGoodYears.push(year.year);
    if (year.focus === "食伤" && year.score < 55) examBadYears.push(year.year);
  }

  // ── 大运打分(0-100) ──
  const dayunScored = profile.dayun.map((step) => {
    const base = step.tone === "good" ? 78 : step.tone === "caution" ? 50 : 64;
    const jitter = (step.ganzhi.charCodeAt(0) + step.ganzhi.charCodeAt(1)) % 9;
    return { ...step, score: Math.min(90, Math.max(42, base + jitter - 4)) };
  });

  // ── 财富区间 ──
  const wealthGod = profile.tenGods.find((g) => g.name === "财星")?.value ?? 0;
  const strong = profile.summary.strength === "身强";
  let wealthRange: string;
  if (strong && wealthGod >= 2) wealthRange = "5000万–1.2亿";
  else if (strong && wealthGod >= 1.5) wealthRange = "3000万–7000万";
  else if (strong) wealthRange = "1500万–4000万";
  else if (profile.summary.strength === "中和" && wealthGod >= 1.5) wealthRange = "1000万–3000万";
  else if (wealthGod >= 2.5) wealthRange = "800万–2000万(须借势:搭平台与合伙人才能兑现)";
  else wealthRange = "600万–1500万";
  const wealthTrend = (step: (typeof dayunScored)[number]) => (step.score >= 78 ? "强劲 ↑↑" : step.score >= 68 ? "向好 ↑" : step.score >= 55 ? "平稳 →" : "承压 ↓");
  const wealthReason = `${profile.summary.strength}${wealthGod >= 2 ? "+财星成色足" : wealthGod >= 1 ? "+财星有成色" : "+财星偏弱(靠技能与平台变现)"},${dayunScored.slice(0, 4).some((x) => x.score >= 75) ? "且中年有大运推力" : "大运推力中等,靠复利积累"}`;

  // ── 流年标签 ──
  const wealthTag = (score: number) => score >= 70 ? "扩张窗口·可加码" : score >= 50 ? "稳健进账·守节奏" : score >= 40 ? "现金为王·防套牢" : "收缩防御·忌杠杆";
  const careerTag = (score: number) => score >= 70 ? "升迁发力年" : score >= 50 ? "稳步积累期" : score >= 40 ? "调整再定位" : "守住基本盘";

  // ── 健康 ──
  const sortedEls = (Object.entries(chart.wuXing) as Array<[Element, number]>).sort((a, b) => a[1] - b[1]);
  const weakEls = sortedEls.filter(([el]) => el !== dayEl).slice(0, 2).map(([el]) => el);
  const chongCount = profile.relations.filter((r) => r.title.includes("相冲")).length;

  // ── 子女 ──
  const outputGod = profile.tenGods.find((g) => g.name === "食伤")?.value ?? 0;
  const officerGod = profile.tenGods.find((g) => g.name === "官杀")?.value ?? 0;
  const hourZhi = allZhi[3];
  const hourEl = ZHI_WUXING[hourZhi];

  // ── 六亲 ──
  const fatherGod = profile.tenGods.find((g) => g.name === "财星")?.value ?? 0;
  const motherGod = sealWeight;
  const siblingGod = profile.tenGods.find((g) => g.name === "比劫")?.value ?? 0;

  // ── 性格反差(显干 vs 藏干) ──
  const visibleStems = chart.pillars.map((p) => p.shiShenGan).filter(Boolean);
  const hiddenCore = chart.pillars[2].hideShiShen.filter(Boolean);

  return {
    portrait: {
      strength: {
        content: `TA属于${profile.summary.strength}格局（日主${dayMaster}${dayEl}）。五行最喜${favorable.join("和")}，最忌${cautious.join("和")}——喜的是${profile.summary.favorable.includes("水") ? "滋润与弹性" : "助力"}，忌的是过载。`,
        highlights: [profile.summary.strength + "格局", dayMaster + dayEl, ...favorable, ...cautious],
      } as RichParagraph,
      dao: {
        content: `TA的核心道法是「${daoName}」——${daoExplain}。`,
        highlights: [daoName],
      } as RichParagraph,
      favorable: {
        label: "喜神",
        content: `${favorable.join("、")}（${favorable.map((el) => elementGod(el, dayEl)).join("、")}）——${favorable.join("、")}属性的人、环境与赛道是助力来源，主动靠近会让状态和财运同步变好。`,
      } as LabeledParagraph,
      unfavorable: {
        label: "忌神",
        content: `${cautious.join("、")}（${cautious.map((el) => elementGod(el, dayEl)).join("、")}）——${cautious.join("、")}过旺的环境是消耗来源，遇到要降速、设边界，别硬扛。`,
      } as LabeledParagraph,
      neutral: (() => {
        const all: Element[] = ["木", "火", "土", "金", "水"];
        const neutralEls = all.filter((el) => !favorable.includes(el) && !cautious.includes(el));
        if (!neutralEls.length) return null;
        return {
          label: "闲神",
          content: `${neutralEls.join("、")}——不站队的力量，顺其自然即可；${neutralEls.join("、")}属性的人和事对 TA 影响中性，不必刻意趋避。`,
        } as LabeledParagraph;
      })(),
      shenSha: ([
        hasYiMa ? { label: "驿马", content: `原局见${yiMaZhi}——动能强，跨境、跨城、频繁出差反而出机会，越动越旺。` } : null,
        hasYangRen ? { label: "羊刃", content: `原局见${yangRenZhi}——爆发力强但易走极端，早年财务与情绪的大起大落多与此有关，需要纪律约束。` } : null,
        hasTaoHua ? { label: "桃花", content: `原局见${taoHuaZhi}——异性缘是双刃剑：魅力即流量，但桃花年要防烂桃花干扰主线。` } : null,
        { label: "贵人", content: guiRenPos >= 0 ? `${["年柱（长辈/上级）", "月柱（同辈/平台）", "日柱（配偶/合伙人）", "时柱（晚辈/学生）"][guiRenPos]}藏贵人——这个位置的人是关键助力，遇到要抓住。` : "贵人多藏于日常，平时结善缘即可。" },
      ].filter(Boolean) as LabeledParagraph[]),
      temperament: [
        {
          content: `外在表现：${visibleStems.slice(0, 2).join("、")}挂在天干——这是别人第一眼看到的 TA，看起来${topGod === "官杀" ? "克制可靠" : topGod === "财星" ? "务实精明" : topGod === "食伤" ? "鲜活有想法" : topGod === "印星" ? "沉静有书卷气" : "独立有冲劲"}。`,
          highlights: visibleStems.slice(0, 2),
        },
        {
          content: `内在动力：日支藏着${hiddenCore.slice(0, 2).join("、")}——只有亲近的人才知道的内核，两者的落差就是 TA 的魅力与拧巴所在。`,
          highlights: hiddenCore.slice(0, 2),
        },
        {
          content: `压力反应：${topGod === "官杀" ? "压力全揽自己身上，表面平静、内里紧绷。" : topGod === "财星" ? "对不确定极度敏感，先算账再谈感情。" : topGod === "食伤" ? "情绪需要出口，憋着就容易上火冲动。" : topGod === "印星" ? "先想清楚再行动，想不通就停摆。" : "不服输，越被质疑越要证明自己。"}`,
          highlights: [],
        },
      ] as RichParagraph[],
    },
    pattern: {
      monthGrid: `月令${monthZhi}(${ZHI_WUXING[monthZhi]}旺),透干比例约 ${Math.round((chart.wuXing[ZHI_WUXING[monthZhi]] / 8) * 100)}%——${topGod}格局,职业依托:${GOD_DESC[topGod]}`,
      monthGridRich: {
        content: `TA 的月令是${monthZhi}（${ZHI_WUXING[monthZhi]}旺），透干比例约 ${Math.round((chart.wuXing[ZHI_WUXING[monthZhi]] / 8) * 100)}%，格局落在「${topGod}格局」——职业依托：${GOD_DESC[topGod]}。`,
        highlights: [monthZhi, topGod + "格局"],
      } as RichParagraph,
      structures: profile.relations.slice(0, 2).map((rel) => ({ rel: rel.title, text: rel.text })),
    },
    education: {
      degree,
      majors: MAJORS[topGod] ?? MAJORS.印星,
      examGood: examGoodYears.slice(0, 3),
      examBad: examBadYears.slice(0, 2),
    },
    career: {
      direction: profile.areas.career.summary,
      management: `${officerGod >= 2 ? "适合带中大型团队(10人以上),风格偏制度型" : officerGod >= 1 ? "适合带小而精的团队(3-8人),风格偏教练型" : "更适合专家路线或小团队,管理大编制会内耗"}`,
      guiren: `贵人:印${sealWeight >= 1.5 ? "旺——长辈、师长、上级是明面贵人" : "弱——贵人多为平辈与合作伙伴"}`,
      xiaoren: `小人:比劫${siblingGod >= 2 ? "偏旺——警惕平辈争利、合伙拆台、口头承诺不落地" : "可控——利益分配提前书面化即可"}`,
      boss: `与上级:${officerGod >= 2 ? "天然敬畏权威,容易被器重,但要防止过度讨好" : "对权威保持距离感,适合结果导向的上级,讨厌 micromanage"}`,
      lifetime: dayunScored.map((step) => ({ ganzhi: step.ganzhi, age: step.ageText, years: step.yearText, score: step.score, note: step.theme, current: step.current })),
      years: profile.annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, score: year.score, tag: careerTag(year.score), action: year.advice })),
    },
    wealth: {
      disclaimer: "以下为纯天赋计算值,未考虑地域/家庭/社会等因素影响,仅供参考。",
      range: wealthRange,
      rangeRich: {
        content: `TA 的财富量级在 ${wealthRange} 之间。${wealthReason}。`,
        highlights: [wealthRange],
      } as RichParagraph,
      reason: wealthReason,
      source: `${wealthGod >= 2.5 ? "偏财型:机会财、项目财占比高" : "正财型:稳定现金流为主"}${siblingGod >= 2 ? ";合伙忌讳:必须先谈退出机制,不做口头合伙" : ";合伙可行,但账目要透明"}`,
      lifetime: dayunScored.map((step) => ({ ganzhi: step.ganzhi, age: step.ageText, trend: wealthTrend(step), note: step.tone === "good" ? "可加大投入、配置资产" : step.tone === "caution" ? "现金流优先,降杠杆" : "稳步积累,不贪快" })),
      years: profile.annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, tag: wealthTag(year.score), note: year.opportunity })),
    },
    love: {
      spouse: report.love.spouseTraits,
      family: report.love.family.replace("对方家庭 ", ""),
      stability: report.love.stability.replace("婚姻稳定性 ", ""),
      lifetime: report.love.marriageLuck.map((luck) => ({ ganzhi: luck.ganzhi, age: luck.ageText, tag: luck.tag, note: luck.text })),
      years: report.love.romanceYears.map((year) => ({ year: year.year, ganzhi: year.ganzhi, prob: year.probability, warn: year.warn, note: year.text })),
    },
    health: {
      organs: weakEls.map((el) => ORGAN[el]),
      acute: chongCount >= 2 ? `原局冲位较多(${chongCount}处):出行与运动防护要做足,急性意外信号偏强` : "原局冲位可控:常规防护即可",
      mental: `${topGod === "官杀" ? "压力型内耗:容易把责任全揽身上,焦虑以身体紧张形式出现" : topGod === "印星" ? "思虑型内耗:想得多做得慢,焦虑以犹豫形式出现" : topGod === "食伤" ? "表达型内耗:情绪需要出口,憋着就上火" : topGod === "财星" ? "结果型内耗:对不确定极度敏感,焦虑以失眠形式出现" : "竞争型内耗:不服输,焦虑以暴躁形式出现"}。解法:${topGod === "官杀" || topGod === "财星" ? "规律运动+明确截止时间" : topGod === "印星" ? "先做再想,小步快跑" : "创作与输出即是解药"}`,
    },
    children: {
      fate: outputGod >= 2 ? "子女缘旺,来得偏早,与晚辈天生亲" : outputGod >= 1 ? "子女缘正常,节奏看个人选择" : "子女缘偏晚或偏淡,重质不重量",
      gender: `倾向参考:官杀(${officerGod.toFixed(1)}) vs 食伤(${outputGod.toFixed(1)})——${officerGod > outputGod ? "女宝概率略高" : outputGod > officerGod ? "男宝概率略高" : "势均力敌"}(仅供娱乐参考)`,
      relation: favorable.includes(hourEl) ? `时柱(${hourZhi},${hourEl})为喜用:晚年得子女助力,相处像朋友` : cautious.includes(hourEl) ? `时柱(${hourZhi},${hourEl})为忌:与子女需保持边界感,少干预多支持` : `时柱(${hourZhi},${hourEl})中性:关系疏密取决于陪伴投入`,
    },
    family: {
      father: `偏财${fatherGod >= 2 ? "旺:父亲能力强或存在感强,父子互动偏'崇拜-超越'剧本" : fatherGod >= 1 ? "有成色:父亲提供基本盘,关系务实" : "不显:父亲陪伴或影响偏弱,早年独立性被逼出来"}`,
      mother: `印星${motherGod >= 2 ? "旺:母亲关怀浓度高,注意边界感,别让照顾变成控制" : motherGod >= 1 ? "适中:母子关系健康,是稳定后盾" : "偏弱:与母亲聚少离多或沟通偏淡,主动关心即可改善"}`,
      siblings: `比劫${siblingGod >= 2 ? "旺:同辈是双刃剑——人脉资源多,但借贷担保要设上限,救急不救穷" : siblingGod >= 1 ? "适中:同辈关系清爽,合作靠规则" : "弱:独狼倾向,重大决定靠自己拍板"}`,
    },
  };
}

function elementGod(el: Element, dayEl: Element): string {
  const SHENG: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const KE: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (el === dayEl) return "比劫(同伴)";
  if (SHENG[dayEl] === el) return "食伤(才华)";
  if (KE[dayEl] === el) return "财星(资源)";
  if (KE[el] === dayEl) return "官杀(责任)";
  return "印星(学识)";
}

export { ZHI_HIDDEN, yearGanZhi };
