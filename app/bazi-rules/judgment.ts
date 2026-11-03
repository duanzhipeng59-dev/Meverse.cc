// ── 统一判断对象 BaziJudgment(个人报告 V3 的单一事实源) ────────────────
// 由排盘引擎结果确定性导出:锚点(旺衰/格局/扶抑喜忌/调候/十神/财富档/配偶星/
// 子女星)+ 事实(四柱/关系含三合/神煞/大运流年评估)+ evidence 清单 + 确定性
// timelines。所有章节 prompt 注入同一份对象,跨章一致由构造保证;AI 只做措辞
// 翻译,不得改判任何锚点。
// 大运/流年评分使用本层的新喜忌口径(与旧 profile 的差异在改动文档中说明)。

import { Solar } from "lunar-javascript";
import type { BaziChart } from "../myfate-bazi-engine";
import type { BaziLifeProfile } from "../myfate-bazi-profile";
import { computeWealthTier, type WealthTierResult } from "../myfate-wealth-tier";
import {
  GAN_WUXING, HE_HUA_NOTE, ZHI_WUXING, elementOfCategory, tenGodOf,
  type Element, type TenGodCategory,
} from "./constants";
import { describeRelation, scanExternalRelations, scanPillarRelations, type RelationHit } from "./relations";
import { buildShenSha, type ShenShaItem } from "./shensha";
import {
  fuYongOf, idleElements, judgeStrength, monthOrder, strengthBucket, tenGodWeightsOf,
  type FuYongResult, type StrengthResult, type TenGodWeight,
} from "./strength";
import { judgePattern, type PatternResult } from "./pattern";
import { judgeTiaoHou, type TiaoHouResult } from "./tiaohou";

export type Evidence = { id: string; fact: string; source: "bazi-engine" };

export type DaYunAssessment = {
  ganzhi: string;
  ageText: string;
  yearText: string;
  current: boolean;
  ganGod: string;
  zhiGod: string;
  tone: "good" | "neutral" | "caution";
  score: number;
  helpful: boolean;
  taxing: boolean;
  interactions: string[];
  theme: string;
  opportunity: string;
  watch: string;
  action: string;
};

export type AnnualAssessment = {
  year: number;
  ganzhi: string;
  dayunGanzhi: string;
  score: number;
  tone: "good" | "neutral" | "caution";
  signals: string[];
  basis: string[];
  keyword: string;
  theme: string;
  opportunity: string;
  watch: string;
  advice: string;
  liChunNote: string | null;
};

export type BaziJudgment = {
  meta: { pillarCount: number; gender: "male" | "female"; hasHourPillar: boolean };
  anchors: {
    dayMaster: string;
    dayElement: Element;
    yinYang: string;
    strength: StrengthResult;
    pattern: PatternResult;
    fuYong: FuYongResult;
    idle: Element[];
    tiaoHou: TiaoHouResult;
    tenGods: TenGodWeight[];
    wealthTier: WealthTierResult;
    spouseStar: { category: TenGodCategory; element: Element; weight: number; favorable: boolean | null; basis: string };
    childrenStar: { category: TenGodCategory; element: Element; weight: number; hourPillar: string | null; basis: string };
    dominantElement: Element;
    missingElements: Element[];
    monthOrder: { branch: string; element: Element; text: string };
  };
  facts: {
    pillars: BaziChart["pillars"];
    wuXing: Record<string, number>;
    transparentStems: string[];
    relations: RelationHit[];
    relationTexts: string[];
    shenSha: ShenShaItem[];
    dayun: DaYunAssessment[];
    annual: AnnualAssessment[];
    annualRange: string;
    heHuaNote: string;
  };
  evidence: Evidence[];
  timelines: {
    career: { dayun: TimelineItem[]; annual: AnnualTimelineItem[] };
    wealth: { dayun: TimelineItem[]; annual: AnnualTimelineItem[] };
    relationship: { dayun: TimelineItem[]; annual: AnnualTimelineItem[] };
  };
};

export type TimelineItem = {
  ganzhi: string; age: string; years: string; label: "明显顺势" | "温和向好" | "平稳蓄力" | "波动调整" | "谨慎收缩";
  score: number; theme: string; opportunity: string; watch: string; action: string; current: boolean;
};
export type AnnualTimelineItem = Omit<TimelineItem, "age" | "years" | "current"> & { year: number };

// ── 大运十神类别文案池(V3 新写,与旧 profile 文案区分) ──────────────────
const DAYUN_THEME: Record<TenGodCategory, string> = {
  比劫: "这十年自主权与同辈能量唱主角,适合打出自己的阵地,合伙先定规矩",
  印星: "这十年以吸收为主——学习、资质、贵人庇护,是蓄力期",
  食伤: "这十年表达与创作欲外放,作品与名声更容易立起来",
  财星: "这十年务实经营与资源整合是主线,现金流机会明显增多",
  官杀: "这十年责任与考核加身,位置与压力同步上升",
};
const DAYUN_OPPORTUNITY: Record<TenGodCategory, string> = {
  比劫: "争取主导权与可见度,同辈协作能放大战果",
  印星: "系统学习、考取资质、靠近师长资源,复利最长",
  食伤: "把想法做成作品,对外表达就是杠杆",
  财星: "把能力产品化,谈判与合作窗口打开",
  官杀: "接更重的担子,专业信誉是这十年的通货",
};
const DAYUN_WATCH: Record<TenGodCategory, string> = {
  比劫: "利益边界与担保借贷,口头承诺易留隐患",
  印星: "舒适区依赖与想多做少,学完要落地",
  食伤: "兴趣发散与情绪化表达,聚焦才有效",
  财星: "透支与杠杆,机会越多越要守现金流",
  官杀: "多头承诺与自我苛责,压力要有出口",
};
const DAYUN_ACTION: Record<TenGodCategory, string> = {
  比劫: "合作书面化、分账前置,每年锁定一件自己主导的事",
  印星: "选一个两年能拿下的体系课程,学完立刻找场景用",
  食伤: "固定一个表达阵地按周输出,季度完成一件完整作品",
  财星: "大额支出设冷静期,资产每年盘点一次",
  官杀: "接新事前先减旧事,用书面计划管理承诺",
};
const ANNUAL_KEYWORD: Record<TenGodCategory, string[]> = {
  比劫: ["自立门户", "同辈助力", "资源角力"], 印星: ["进修养神", "贵人指点", "蓄力沉淀"],
  食伤: ["才华露头", "表达破局", "灵感迸发"], 财星: ["进账窗口", "合作落地", "务实经营"],
  官杀: ["担纲压阵", "考核进阶", "责任升级"],
};

function yearGanZhiOf(year: number): string {
  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const index = ((year - 1984) % 60 + 60) % 60;
  return GAN[index % 10] + ZHI[index % 12];
}

function liChunDayOf(year: number): number | null {
  for (let day = 3; day <= 5; day += 1) {
    // lunar-javascript 运行时提供 getJieQi(),社区类型声明未同步(engine 同款 cast 处理)
    const lunar = Solar.fromYmdHms(year, 2, day, 12, 0, 0).getLunar() as unknown as { getJieQi(): string };
    if (lunar.getJieQi() === "立春") return day;
  }
  return null;
}

// ── 大运评估(新喜忌口径) ────────────────────────────────────────────────
function assessDayun(chart: BaziChart, favorable: Element[], cautious: Element[]): DaYunAssessment[] {
  const dayMaster = chart.dayMaster;
  const categoryOf = elementOfCategory(dayMaster);
  return chart.daYun.steps.map((step) => {
    const ganGod = tenGodOf(dayMaster, step.ganzhi[0]);
    const zhiGod = tenGodOf(dayMaster, step.ganzhi[1]);
    const ganCategory = Object.keys(categoryOf).find((key) => categoryOf[key as TenGodCategory] === GAN_WUXING[step.ganzhi[0]]) as TenGodCategory;
    const interactions = scanExternalRelations({ label: "大运", ganzhi: step.ganzhi }, chart.pillars).map(describeRelation);
    const ganEl = GAN_WUXING[step.ganzhi[0]];
    const zhiEl = ZHI_WUXING[step.ganzhi[1]];
    const helpful = favorable.includes(ganEl) || favorable.includes(zhiEl);
    const taxing = cautious.includes(ganEl) && cautious.includes(zhiEl);

    let score = 62;
    if (favorable.includes(ganEl)) score += 8;
    if (favorable.includes(zhiEl)) score += 8;
    if (cautious.includes(ganEl)) score -= 7;
    if (cautious.includes(zhiEl)) score -= 7;
    for (const text of interactions) {
      if (text.includes("与日支") && text.includes("相冲")) score -= 8;
      else if (text.includes("与日支") && text.includes("六合")) score += 5;
      else if (text.includes("与日柱") && text.includes("天干五合")) score += 3;
      else if (text.includes("相刑")) score -= 4;
      else if (text.includes("三合") || text.includes("半合")) score += 3;
    }
    score = Math.max(35, Math.min(92, score));
    const tone: DaYunAssessment["tone"] = score >= 68 ? "good" : score < 50 ? "caution" : "neutral";
    const moodPrefix = helpful ? "喜用到位," : taxing ? "忌神偏重," : "喜忌参半,";

    return {
      ganzhi: step.ganzhi,
      ageText: `${step.startAge}–${step.endAge}岁`,
      yearText: `${step.startYear}–${step.endYear}`,
      current: step.current,
      ganGod, zhiGod, tone, score, helpful, taxing, interactions,
      theme: `${step.ganzhi}大运,干支十神为${ganGod}/${zhiGod},${moodPrefix}${DAYUN_THEME[ganCategory]}。`,
      opportunity: DAYUN_OPPORTUNITY[ganCategory],
      watch: DAYUN_WATCH[ganCategory],
      action: DAYUN_ACTION[ganCategory],
    };
  });
}

// ── 流年评估(未来10年,新喜忌口径;信号集与旧引擎一致,刑为双向) ─────────
function assessAnnual(chart: BaziChart, dayun: DaYunAssessment[], favorable: Element[], cautious: Element[], currentYear: number): AnnualAssessment[] {
  const dayMaster = chart.dayMaster;
  const branches = chart.pillars.map((p) => p.ganzhi[1]);
  const dayBranch = branches[2];
  const monthBranch = branches[1];
  const now = new Date();
  const firstLiChun = liChunDayOf(currentYear);
  const beforeLiChun = firstLiChun !== null && (now.getMonth() < 1 || (now.getMonth() === 1 && now.getDate() < firstLiChun));

  return Array.from({ length: 10 }, (_, index) => {
    const year = currentYear + index;
    const ganzhi = yearGanZhiOf(year);
    const ganEl = GAN_WUXING[ganzhi[0]];
    const zhiEl = ZHI_WUXING[ganzhi[1]];
    const step = chart.daYun.steps.find((item) => year >= item.startYear && year <= item.endYear)
      ?? chart.daYun.steps.find((item) => item.current)
      ?? chart.daYun.steps[0];

    const signals: string[] = [];
    const basis: string[] = [`流年${ganzhi}:天干${ganzhi[0]}（${tenGodOf(dayMaster, ganzhi[0])}）、地支${ganzhi[1]}（${tenGodOf(dayMaster, ganzhi[1])}主气）`];
    let score = 60;
    if (favorable.includes(ganEl)) { score += 12; signals.push("喜用天干"); }
    if (favorable.includes(zhiEl)) { score += 8; signals.push("喜用地支"); }
    if (cautious.includes(ganEl)) { score -= 10; signals.push("忌神天干"); }
    if (cautious.includes(zhiEl)) { score -= 7; signals.push("忌神地支"); }

    const ext = scanExternalRelations({ label: `流年${ganzhi}`, ganzhi }, chart.pillars);
    for (const hit of ext) {
      const text = describeRelation(hit);
      const withDay = text.includes("日柱");
      if (hit.type === "chong" && hit.b.value === dayBranch) { score -= 9; signals.push("冲日支(夫妻宫)"); basis.push(text); }
      else if (hit.type === "liuhe" && hit.b.value === dayBranch) { score += 7; signals.push("合日支(夫妻宫)"); basis.push(text); }
      else if (hit.type === "chong" && hit.b.value === monthBranch) { score -= 4; signals.push("冲月支"); basis.push(text); }
      else if (hit.type === "liuhe" && hit.b.value === monthBranch) { score += 4; signals.push("合月支"); basis.push(text); }
      else if (hit.type === "xing" && withDay) { score -= 3; signals.push("刑日支"); basis.push(text); }
      else if (hit.type === "hai" && withDay) { score -= 2; signals.push("害日支"); basis.push(text); }
      else if ((hit.type === "sanhe" || hit.type === "banhe") && withDay) { score += 3; signals.push("会局涉日支"); basis.push(text); }
    }
    if (step) {
      const chongDayun = scanExternalRelations({ label: "流年", ganzhi }, [{ label: "大运", ganzhi: step.ganzhi }]);
      if (chongDayun.some((hit) => hit.type === "chong")) { score -= 5; signals.push("冲大运支"); basis.push(`流年支与${step.ganzhi}大运支相冲,短期节奏与十年主线有拉扯。`); }
      if (chongDayun.some((hit) => hit.type === "liuhe")) { score += 5; signals.push("合大运支"); basis.push(`流年支与${step.ganzhi}大运支相合,年度机会与长期主线相互成就。`); }
    }
    if (GAN_WUXING[ganzhi[0]] && "甲己|乙庚|丙辛|丁壬|戊癸".split("|").some((pair) => pair === ganzhi[0] + dayMaster || pair === dayMaster + ganzhi[0])) {
      score += 3; signals.push("流年干合日主"); basis.push(`流年天干${ganzhi[0]}与日干${dayMaster}相合,外部力量主动牵引。`);
    }
    score = Math.max(38, Math.min(88, score));
    const tone: AnnualAssessment["tone"] = score >= 70 ? "good" : score < 50 ? "caution" : "neutral";
    if (!signals.length) basis.push(`与原局无明显合冲刑害,以${step?.ganzhi ?? "当前"}大运的既有节奏展开。`);

    const catMap = elementOfCategory(dayMaster);
    const ganCategory = (Object.keys(catMap) as TenGodCategory[]).find((key) => catMap[key] === ganEl) ?? "比劫";
    const keyword = ANNUAL_KEYWORD[ganCategory][(year + ganCategory.length) % 3];
    const liChunNote = index === 0 && beforeLiChun
      ? `${year}年立春（2月${firstLiChun}日）前仍属${yearGanZhiOf(year - 1)}年,本年流年断语以立春后的${ganzhi}年计`
      : null;

    return {
      year, ganzhi, dayunGanzhi: step?.ganzhi ?? "", score, tone, signals, basis,
      keyword,
      theme: `${ganzhi}年${signals.length ? `关键信号:${signals.join("、")}` : "无明显强信号,延续大运主题"}`,
      opportunity: score >= 70 ? "顺势年:资源向核心目标集中,适合推进关键决定" : score < 50 ? "调整年:控制变量少做加法,先稳基本盘" : "平稳年:按既定节奏推进,不激进不收缩",
      watch: signals.some((s) => s.includes("忌神") || s.includes("冲") || s.includes("刑")) ? "留意压力与消耗信号,重要决定留冷静期" : "留意节奏性疲劳,保持作息底线",
      advice: score >= 70 ? "把优势窗口用在最重要的一两件事上" : score < 50 ? "少开新线,守住现金流与身心健康" : "保持执行深度,季度复盘一次",
      liChunNote,
    };
  });
}

// ── timelines(确定性,直接入报告) ──────────────────────────────────────
function toTimelineItems(dayun: DaYunAssessment[]): TimelineItem[] {
  return dayun.map((step) => ({
    ganzhi: step.ganzhi,
    age: step.ageText,
    years: step.yearText,
    label: step.tone === "good" ? (step.score >= 80 ? "明显顺势" : "温和向好") : step.tone === "caution" ? (step.score < 45 ? "谨慎收缩" : "波动调整") : "平稳蓄力",
    score: step.score,
    theme: step.theme.slice(0, 60),
    opportunity: step.opportunity,
    watch: step.watch,
    action: step.action,
    current: step.current,
  }));
}
function toAnnualItems(annual: AnnualAssessment[]): AnnualTimelineItem[] {
  return annual.map((year) => ({
    year: year.year,
    ganzhi: year.ganzhi,
    label: year.tone === "good" ? (year.score >= 78 ? "明显顺势" : "温和向好") : year.tone === "caution" ? (year.score < 45 ? "谨慎收缩" : "波动调整") : "平稳蓄力",
    score: year.score,
    theme: year.theme.slice(0, 60),
    opportunity: year.opportunity,
    watch: year.watch,
    action: year.advice,
  }));
}

// ── 组装 ────────────────────────────────────────────────────────────────
export function buildBaziJudgment(chart: BaziChart, profile: BaziLifeProfile, currentYear = new Date().getFullYear()): BaziJudgment {
  const dayMaster = chart.dayMaster;
  const dayElement = GAN_WUXING[dayMaster];
  const categoryOf = elementOfCategory(dayMaster);

  const strength = judgeStrength(chart);
  const pattern = judgePattern(chart, strength);
  const fuYong = fuYongOf(chart, strength);
  const idle = idleElements(fuYong);
  const tiaoHou = judgeTiaoHou(chart, fuYong);
  const tenGods = tenGodWeightsOf(chart);
  const weights = Object.fromEntries(tenGods.map((item) => [item.category, item.value])) as Record<TenGodCategory, number>;

  // 财富 T 档:沿用引擎定档,但旺衰/喜忌输入替换为规则层新口径(同盘同值仍成立)
  const adaptedProfile = {
    ...profile,
    summary: {
      ...profile.summary,
      strength: strengthBucket(strength.level),
      favorable: fuYong.favorable,
      cautious: fuYong.cautious,
    },
  } as BaziLifeProfile;
  const wealthTier = computeWealthTier(chart, adaptedProfile);

  // 配偶星:男命看财星、女命看官杀
  const spouseCategory: TenGodCategory = chart.gender === "female" ? "官杀" : "财星";
  const spouseFavorable = fuYong.favorable.includes(categoryOf[spouseCategory]) ? true : fuYong.cautious.includes(categoryOf[spouseCategory]) ? false : null;
  const dayBranchPillar = chart.pillars[2];
  const spouseStar = {
    category: spouseCategory,
    element: categoryOf[spouseCategory],
    weight: weights[spouseCategory],
    favorable: spouseFavorable,
    basis: `${chart.gender === "female" ? "女命以官杀为配偶星" : "男命以财星为配偶星"}:配偶星${spouseCategory}（${categoryOf[spouseCategory]}）权重${weights[spouseCategory]},${spouseFavorable === true ? "属喜用" : spouseFavorable === false ? "属忌神" : "属闲神"};夫妻宫为日支${dayBranchPillar.ganzhi[1]},藏干${dayBranchPillar.hideGan.join("、")}（${dayBranchPillar.hideShiShen.join("、")}）。`,
  };

  // 子女星:男命看官杀、女命看食伤;时柱为子女宫
  const childrenCategory: TenGodCategory = chart.gender === "female" ? "食伤" : "官杀";
  const hourPillar = chart.pillars[3] ?? null;
  const childrenStar = {
    category: childrenCategory,
    element: categoryOf[childrenCategory],
    weight: weights[childrenCategory],
    hourPillar: hourPillar ? hourPillar.ganzhi : null,
    basis: `${chart.gender === "female" ? "女命以食伤为子女星" : "男命以官杀为子女星"}:子女星${childrenCategory}（${categoryOf[childrenCategory]}）权重${weights[childrenCategory]};${hourPillar ? `时柱${hourPillar.ganzhi}为子女宫,藏干${hourPillar.hideGan.join("、")}（${hourPillar.hideShiShen.join("、")}）` : "时柱未定(出生时间不公开),子女论断以子女星与喜忌为据,不涉及时柱宫位"}。`,
  };

  const relations = scanPillarRelations(chart.pillars.map((p) => ({ label: p.label, ganzhi: p.ganzhi })));
  const relationTexts = relations.map(describeRelation);
  const shenSha = buildShenSha(chart);
  const transparentStems: string[] = [];
  const monthHidden = chart.pillars[1].hideGan;
  for (const pillar of chart.pillars) {
    if (pillar.label === "日柱") continue;
    if (monthHidden.includes(pillar.ganzhi[0])) transparentStems.push(`月令藏干${pillar.ganzhi[0]}透于${pillar.label}（${pillar.shiShenGan}）`);
  }

  const dayun = assessDayun(chart, fuYong.favorable, fuYong.cautious);
  const annual = assessAnnual(chart, dayun, fuYong.favorable, fuYong.cautious, currentYear);

  const counts = chart.wuXing as Record<Element, number>;
  const ordered = (Object.keys(counts) as Element[]).sort((a, b) => counts[b] - counts[a]);
  const dominantElement = ordered[0];
  const missingElements = ordered.filter((el) => counts[el] === 0).reverse();

  const evidence: Evidence[] = [
    ...chart.pillars.map((pillar, index) => ({
      id: `chart.pillar-${index + 1}`,
      fact: `${pillar.label}${pillar.ganzhi},天干十神${pillar.shiShenGan},藏干${pillar.hideGan.join("、")}（藏干十神${pillar.hideShiShen.join("、")}）,纳音${pillar.naYin},十二长生${pillar.diShi}`,
      source: "bazi-engine" as const,
    })),
    { id: "chart.day-master", fact: `日主${dayMaster}（五行${dayElement},${["甲", "丙", "戊", "庚", "壬"].includes(dayMaster) ? "阳" : "阴"}干）`, source: "bazi-engine" },
    { id: "chart.elements", fact: `原局五行计数:${Object.entries(chart.wuXing).map(([key, value]) => `${key}${value}`).join("、")}${missingElements.length ? `;缺${missingElements.join("、")}` : ";五行俱全"}`, source: "bazi-engine" },
    { id: "structure.strength", fact: `旺衰判定:${strength.level}——${strength.rationale.join(";")}`, source: "bazi-engine" },
    { id: "structure.pattern", fact: `格局判定:「${pattern.name}」（${pattern.tier}）——${pattern.basis}`, source: "bazi-engine" },
    { id: "structure.favorable", fact: `扶抑喜用:${fuYong.favorable.join("、")};${fuYong.basis}`, source: "bazi-engine" },
    { id: "structure.cautious", fact: `扶抑忌神:${fuYong.cautious.join("、")};闲神:${idle.join("、") || "无"}`, source: "bazi-engine" },
    { id: "structure.tiaohou", fact: `调候分析:${tiaoHou.basis}`, source: "bazi-engine" },
    { id: "structure.hehua", fact: HE_HUA_NOTE, source: "bazi-engine" },
    { id: "area.wealth-tier", fact: `财富档位${wealthTier.tier}（${wealthTier.range}）——${wealthTier.chain}`, source: "bazi-engine" },
    ...tenGods.map((god, index) => ({ id: `tenGod.${index + 1}`, fact: `${god.category}权重${god.value},层级${god.level}`, source: "bazi-engine" as const })),
    ...relationTexts.map((text, index) => ({ id: `relation.${index + 1}`, fact: text, source: "bazi-engine" as const })),
    ...shenSha.map((item) => ({
      id: `shensha.${item.name === "驿马" ? "yima" : item.name === "阳刃" ? "yangren" : "taohua"}`,
      fact: `神煞${item.name}:${item.meaning}`,
      source: "bazi-engine" as const,
    })),
    { id: "area.spouse", fact: spouseStar.basis, source: "bazi-engine" },
    { id: "area.children", fact: childrenStar.basis, source: "bazi-engine" },
    { id: "area.parents", fact: `六亲取星:偏财为父（权重${weights.财星}内含偏财,具体藏透见四柱）、正印为母（印星权重${weights.印星}）;年柱${chart.pillars[0].ganzhi}为祖上/早年宫位,月柱${chart.pillars[1].ganzhi}为父母/成长宫位,藏干${chart.pillars[1].hideGan.join("、")}。`, source: "bazi-engine" },
    { id: "area.siblings", fact: `比劫（${categoryOf.比劫}）权重${weights.比劫},${fuYong.favorable.includes(categoryOf.比劫) ? "属喜用" : fuYong.cautious.includes(categoryOf.比劫) ? "属忌神" : "属闲神"}——同辈缘分与合作模式的取用依据。`, source: "bazi-engine" },
    { id: "area.education", fact: `学业取象:印星（${categoryOf.印星}）权重${weights.印星}、食伤（${categoryOf.食伤}）权重${weights.食伤};${fuYong.favorable.includes(categoryOf.印星) ? "印星属喜用,吸收与考试型学习占优" : fuYong.cautious.includes(categoryOf.印星) ? "印星属忌神,学习更靠输出与实践驱动" : "印星居闲神,学习模式混合"}。`, source: "bazi-engine" },
    { id: "area.career", fact: `事业取象:官杀（${categoryOf.官杀}）权重${weights.官杀},财星权重${weights.财星};月柱${chart.pillars[1].ganzhi}天干十神${chart.pillars[1].shiShenGan}为事业起步底色。`, source: "bazi-engine" },
  ];

  const timelines = {
    career: { dayun: toTimelineItems(dayun), annual: toAnnualItems(annual) },
    wealth: { dayun: toTimelineItems(dayun), annual: toAnnualItems(annual) },
    relationship: { dayun: toTimelineItems(dayun), annual: toAnnualItems(annual) },
  };

  return {
    meta: { pillarCount: chart.pillars.length, gender: chart.gender, hasHourPillar: Boolean(chart.pillars[3]) },
    anchors: {
      dayMaster, dayElement,
      yinYang: ["甲", "丙", "戊", "庚", "壬"].includes(dayMaster) ? "阳" : "阴",
      strength, pattern, fuYong, idle, tiaoHou, tenGods, wealthTier, spouseStar, childrenStar,
      dominantElement, missingElements,
      monthOrder: monthOrder(chart),
    },
    facts: {
      pillars: chart.pillars,
      wuXing: chart.wuXing,
      transparentStems,
      relations,
      relationTexts,
      shenSha,
      dayun,
      annual,
      annualRange: `${annual[0]?.year}–${annual[annual.length - 1]?.year}`,
      heHuaNote: HE_HUA_NOTE,
    },
    evidence,
    timelines,
  };
}
