// ── 日主旺衰统一算法(个人报告 V3) ──────────────────────────────────────
// 子平加权口径:得令(月令司令)、得地(地支藏干通根)、得势(天干同党透出)三项
// 加权计同党(比劫+印星)与异党(财官食伤)的力量比,输出七档:
// 从强 / 身强 / 偏强 / 中和 / 偏弱 / 身弱 / 从弱。
// 从格须专门检测(同党或异党近乎为零),不做中间态猜判。
// 说明:旺衰只描述日主与全局力量的对比,不等于人生吉凶;喜忌由 fuYongOf 另行推导。

import type { BaziChart } from "../myfate-bazi-engine";
import {
  GAN_WUXING, ZHI_HIDDEN, ZHI_WUXING, elementOfCategory, tenGodCategory, tenGodOf,
  type Element, type TenGodCategory,
} from "./constants";

export type StrengthLevel = "从强" | "身强" | "偏强" | "中和" | "偏弱" | "身弱" | "从弱";
/** 档位家族(跨章一致性用):强族/弱族/从族/中和 */
export type StrengthFamily = "强" | "弱" | "从" | "中和";

export type StrengthResult = {
  level: StrengthLevel;
  family: StrengthFamily;
  /** 同党/异党力量与比值(0-1) */
  score: { support: number; drain: number; ratio: number };
  /** 得令/得地/得势的逐条依据(引用具体干支) */
  rationale: string[];
};

const CATEGORY_LABEL: Record<TenGodCategory, string> = {
  比劫: "比劫(同我)", 印星: "印星(生我)", 食伤: "食伤(我生)", 财星: "财星(我克)", 官杀: "官杀(克我)",
};

export function judgeStrength(chart: BaziChart): StrengthResult {
  const dayMaster = chart.dayMaster;
  const sameParty: TenGodCategory[] = ["比劫", "印星"];

  let support = 0;
  let drain = 0;
  const rationale: string[] = [];
  const stemSupport: string[] = [];
  const stemDrain: string[] = [];
  const rootSupport: string[] = [];
  const rootDrain: string[] = [];

  // ── 得势:天干透出(日干除外),比劫 2.0/印 1.5 ──
  const stems = chart.pillars.filter((p) => p.label !== "日柱").map((p) => ({ label: p.label, stem: p.ganzhi[0] }));
  for (const { label, stem } of stems) {
    const god = tenGodOf(dayMaster, stem);
    const category = tenGodCategory(god);
    const weight = category === "比劫" ? 2 : category === "印星" ? 1.5 : 1.2;
    const role = category === "比劫" ? "帮身" : category === "印星" ? "生身" : "异党";
    const line = `${label}${stem}（${god},${role}）`;
    if (sameParty.includes(category)) { support += weight; stemSupport.push(line); }
    else { drain += weight; stemDrain.push(line); }
  }

  // ── 得地:地支藏干通根(本3/中2/余1 × 比劫1.0/印0.75);月令 ×1.5 司令加成 ──
  chart.pillars.forEach((pillar) => {
    const isMonth = pillar.label === "月柱";
    const monthFactor = isMonth ? 1.5 : 1;
    for (const hidden of ZHI_HIDDEN[pillar.ganzhi[1]] ?? []) {
      const god = tenGodOf(dayMaster, hidden.stem);
      const category = tenGodCategory(god);
      const base = hidden.weight * (category === "比劫" ? 1 : category === "印星" ? 0.75 : 0.8);
      const weight = base * monthFactor;
      const line = `${pillar.label}${pillar.ganzhi[1]}藏${hidden.stem}（${god},${hidden.grade}${isMonth ? ",月令司令加成" : ""}）`;
      if (sameParty.includes(category)) { support += weight; rootSupport.push(line); }
      else { drain += weight; rootDrain.push(line); }
    }
  });

  const ratio = support + drain > 0 ? support / (support + drain) : 0.5;
  rationale.push(`得势(天干透出):${stemSupport.length ? stemSupport.join("、") : "天干无比劫印星透出"};异党透干 ${stemDrain.join("、") || "无"}`);
  rationale.push(`得地(藏干通根,月令司令×1.5):同党之根 ${rootSupport.join("、") || "无"};异党之根 ${rootDrain.join("、") || "无"}`);

  // ── 从格专门检测:同党/异党力量近乎为零 ──
  let level: StrengthLevel;
  if (drain <= 1.0 && support >= 4) {
    level = "从强";
    rationale.push(`从格判定:异党力量仅${drain.toFixed(1)},日主一气专旺,弃平衡论从强。`);
  } else if (support <= 1.0 && drain >= 4) {
    level = "从弱";
    rationale.push(`从格判定:同党力量仅${support.toFixed(1)},日主无根无助,弃命从势。`);
  } else if (ratio >= 0.66) level = "身强";
  else if (ratio >= 0.56) level = "偏强";
  else if (ratio >= 0.44) level = "中和";
  else if (ratio >= 0.34) level = "偏弱";
  else level = "身弱";

  const family: StrengthFamily =
    level === "从强" || level === "从弱" ? "从"
      : level === "身强" || level === "偏强" ? "强"
        : level === "身弱" || level === "偏弱" ? "弱" : "中和";
  if (level !== "从强" && level !== "从弱") {
    rationale.push(`力量对比:同党${support.toFixed(1)} vs 异党${drain.toFixed(1)},同党占比${Math.round(ratio * 100)}% → ${level}。`);
  }

  return { level, family, score: { support: Math.round(support * 10) / 10, drain: Math.round(drain * 10) / 10, ratio: Math.round(ratio * 100) / 100 }, rationale };
}

/** 档位 → 三大类表述(供与旧口径衔接的下游,如财富定档) */
export function strengthBucket(level: StrengthLevel): "身强" | "身弱" | "从势" {
  if (level === "从强" || level === "从弱") return "从势";
  return level === "身强" || level === "偏强" ? "身强" : level === "身弱" || level === "偏弱" ? "身弱" : "身弱";
}

// ── 扶抑喜忌(与旺衰分离;调候用神由 tiaohou.ts 另行给出) ─────────────────
export type FuYongResult = {
  favorable: Element[];
  cautious: Element[];
  /** 五行 → 十神类别对照说明 */
  mapping: Array<{ element: Element; role: "喜" | "忌"; category: TenGodCategory; why: string }>;
  basis: string;
};

export function fuYongOf(chart: BaziChart, strength: StrengthResult): FuYongResult {
  const dayMaster = chart.dayMaster;
  const cat = elementOfCategory(dayMaster);
  const counts = chart.wuXing as Record<Element, number>;
  const orderedByCount = (Object.keys(counts) as Element[]).sort((a, b) => counts[a] - counts[b]);

  let favorable: Element[];
  let cautious: Element[];
  let basis: string;

  if (strength.level === "从强") {
    favorable = [cat.比劫, cat.印星];
    cautious = [cat.官杀];
    basis = "从强格顺势:喜帮扶(比劫、印星),忌克泄(官杀为最)。";
  } else if (strength.level === "从弱") {
    // 从弱顺势:喜命局异党中最旺的两类力量
    const drainRank: TenGodCategory[] = ["财星", "官杀", "食伤"];
    favorable = drainRank.slice(0, 2).map((category) => cat[category]);
    cautious = [cat.比劫, cat.印星];
    basis = `从弱(从势)顺势:喜命局主导之势(${drainRank.slice(0, 2).map((c) => CATEGORY_LABEL[c]).join("、")}),忌帮扶逆势(比劫、印星)。`;
  } else if (strength.level === "身强" || strength.level === "偏强") {
    // 身强喜克泄耗:官杀/食伤/财三类中补命局较弱的两行(顺势又补缺)
    const drains: Element[] = [cat.官杀, cat.食伤, cat.财星].sort((a, b) => counts[a] - counts[b]);
    favorable = drains.slice(0, 2);
    cautious = [cat.比劫, cat.印星];
    basis = `${strength.level}喜克泄耗:官杀(${cat.官杀})/食伤(${cat.食伤})/财星(${cat.财星})中取命局较弱的两行(${favorable.join("、")})为喜;忌再帮扶(比劫${cat.比劫}、印星${cat.印星})。`;
  } else if (strength.level === "身弱" || strength.level === "偏弱") {
    favorable = [cat.印星, cat.比劫];
    cautious = [cat.官杀, cat.财星];
    basis = `${strength.level}喜生扶:印星(${cat.印星})生身、比劫(${cat.比劫})帮身;忌官杀(${cat.官杀})克身、财星(${cat.财星})耗身。`;
  } else {
    // 中和:补最弱两行,防最旺两行(与喜不重叠)
    favorable = orderedByCount.slice(0, 2);
    cautious = [] as Element[];
    for (let i = orderedByCount.length - 1; i >= 0 && cautious.length < 2; i -= 1) {
      const el = orderedByCount[i];
      if (!favorable.includes(el)) cautious.push(el);
    }
    basis = `中和之局:喜补最弱两行(${favorable.join("、")}),防最旺两行(${cautious.join("、")})过偏。`;
  }

  const mapping = [
    ...favorable.map((element) => ({ element, role: "喜" as const, category: categoryOfElement(dayMaster, element), why: "扶抑取用" })),
    ...cautious.map((element) => ({ element, role: "忌" as const, category: categoryOfElement(dayMaster, element), why: "扶抑取用" })),
  ];
  return { favorable, cautious, mapping, basis };
}

function categoryOfElement(dayMaster: string, element: Element): TenGodCategory {
  const cat = elementOfCategory(dayMaster);
  const found = (Object.keys(cat) as TenGodCategory[]).find((key) => cat[key] === element);
  return found ?? "比劫";
}

/** 闲神:不在喜忌清单中的五行(按出现次数取) */
export function idleElements(fu: FuYongResult): Element[] {
  const all: Element[] = ["木", "火", "土", "金", "水"];
  return all.filter((el) => !fu.favorable.includes(el) && !fu.cautious.includes(el));
}

/** 月令五行与当令说明(供格局/调候引用) */
export function monthOrder(chart: BaziChart): { branch: string; element: Element; text: string } {
  const branch = chart.pillars[1].ganzhi[1];
  const element = ZHI_WUXING[branch];
  return { branch, element, text: `月令${branch}（${element}旺之令）` };
}

// ── 十神权重(规则层统一口径:天干计1(日干除外)、藏干计0.5,与旧 profile 一致) ──
export type TenGodWeight = { category: TenGodCategory; value: number; level: "主导" | "明显" | "潜藏" | "不显" };

export function tenGodWeightsOf(chart: BaziChart): TenGodWeight[] {
  const weights: Record<TenGodCategory, number> = { 比劫: 0, 印星: 0, 食伤: 0, 财星: 0, 官杀: 0 };
  for (const pillar of chart.pillars) {
    if (pillar.label !== "日柱") weights[tenGodCategory(tenGodOf(chart.dayMaster, pillar.ganzhi[0]))] += 1;
    for (const hidden of pillar.hideGan) weights[tenGodCategory(tenGodOf(chart.dayMaster, hidden))] += 0.5;
  }
  const max = Math.max(...Object.values(weights));
  const levelOf = (value: number): TenGodWeight["level"] =>
    value === max ? "主导" : value >= 2 ? "明显" : value > 0 ? "潜藏" : "不显";
  return (Object.keys(weights) as TenGodCategory[])
    .map((category) => ({ category, value: Math.round(weights[category] * 10) / 10, level: levelOf(weights[category]) }))
    .sort((a, b) => b.value - a.value);
}
