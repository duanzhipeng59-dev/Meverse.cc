// ── 双人合盘统一判断对象(双人报告 V3 的单一事实源) ────────────────────
// 双方各自复用个人规则层 buildBaziJudgment 的锚点(旺衰七档/格局/扶抑喜忌/调候),
// 保证同一个人在单人报告与合盘报告中定性完全一致;跨盘关系(干支互动/夫妻宫互看/
// 喜忌互补/旺衰组合/逐年顺压信号)全部确定性推导,AI 只做措辞翻译。
// 跨盘干支互动复用 relations.ts 的 8 支混扫(含三合/半合/破/无序刑),按 A/B 前缀过滤。

import type { BaziChart } from "../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../myfate-bazi-profile";
import {
  CHONG, GAN_WUXING, LIU_HE, ZHI_HIDDEN, ZHI_WUXING, tenGodOf,
  type Element, type TenGodCategory,
} from "./constants";
import { describeRelation, scanPillarRelations, type RelationHit } from "./relations";
import { buildBaziJudgment, type AnnualAssessment, type BaziJudgment, type DaYunAssessment } from "./judgment";

export type DualEvidence = { id: string; fact: string; source: "bazi-engine" };

export type DualPerson = {
  name: string;
  gender: "male" | "female";
  pillars: BaziChart["pillars"];
  wuXing: Record<string, number>;
  dayMaster: string;
  dayElement: Element;
  yinYang: string;
  strengthLevel: string;
  strengthFamily: "强" | "弱" | "从" | "中和";
  patternName: string;
  patternTier: string;
  favorable: Element[];
  cautious: Element[];
  tiaoHouState: string;
  tenGodsText: string;
  spouseStarText: string;
  dayun: DaYunAssessment[];
  annual: AnnualAssessment[];
};

export type AnnualSync = {
  year: number;
  ganzhi: string;
  aScore: number;
  bScore: number;
  signals: string[];
  tone: "good" | "caution" | "neutral";
  note: string;
};

export type DualBaziJudgment = {
  meta: { nameA: string; nameB: string; genderA: "male" | "female"; genderB: "male" | "female"; hasHour: boolean };
  persons: { A: DualPerson; B: DualPerson };
  relation: {
    dayMasterText: string;
    crossRelations: RelationHit[];
    crossRelationTexts: string[];
    spousePalaceText: string;
    wuxingComplementText: string;
    strengthComboText: string;
    annualSync: AnnualSync[];
    annualRange: string;
  };
  evidence: DualEvidence[];
};

function personOf(name: string, chart: BaziChart, judgment: BaziJudgment): DualPerson {
  const a = judgment.anchors;
  return {
    name,
    gender: chart.gender,
    pillars: chart.pillars,
    wuXing: chart.wuXing,
    dayMaster: a.dayMaster,
    dayElement: a.dayElement,
    yinYang: a.yinYang,
    strengthLevel: a.strength.level,
    strengthFamily: a.strength.family,
    patternName: a.pattern.name,
    patternTier: a.pattern.tier,
    favorable: a.fuYong.favorable,
    cautious: a.fuYong.cautious,
    tiaoHouState: a.tiaoHou.state,
    tenGodsText: a.tenGods.map((god) => `${god.category}${god.value}`).join(" > "),
    spouseStarText: a.spouseStar.basis,
    dayun: judgment.facts.dayun,
    annual: judgment.facts.annual,
  };
}

/** A×B 跨盘干支互动:8 柱带 A/B 前缀混扫,过滤出异方配对 */
function crossScan(chartA: BaziChart, chartB: BaziChart, nameA: string, nameB: string): { hits: RelationHit[]; texts: string[] } {
  const labeled = [
    ...chartA.pillars.map((p) => ({ label: `A·${p.label}`, ganzhi: p.ganzhi })),
    ...chartB.pillars.map((p) => ({ label: `B·${p.label}`, ganzhi: p.ganzhi })),
  ];
  const hits = scanPillarRelations(labeled)
    .filter((hit) => (hit.a.label.startsWith("A") && hit.b.label.startsWith("B"))
      || (hit.a.label.startsWith("B") && hit.b.label.startsWith("A")))
    .map((hit) => ({
      ...hit,
      a: { ...hit.a, label: hit.a.label.replace("A·", `${nameA}`).replace("B·", `${nameB}`) },
      b: { ...hit.b, label: hit.b.label.replace("A·", `${nameA}`).replace("B·", `${nameB}`) },
    }));
  return { hits, texts: hits.map(describeRelation) };
}

/** 夫妻宫互看:双方日支互关系 + 日支本气藏干的十神互见 */
function spousePalace(jA: BaziJudgment, jB: BaziJudgment, nameA: string, nameB: string): string {
  const aBranch = jA.facts.pillars[2].ganzhi[1];
  const bBranch = jB.facts.pillars[2].ganzhi[1];
  const aMain = ZHI_HIDDEN[aBranch]?.[0]?.stem ?? "";
  const bMain = ZHI_HIDDEN[bBranch]?.[0]?.stem ?? "";
  const aSeesB = tenGodOf(jA.anchors.dayMaster, bMain);
  const bSeesA = tenGodOf(jB.anchors.dayMaster, aMain);
  let branchRel = "无明显合冲刑害";
  if (LIU_HE[aBranch] === bBranch) branchRel = "六合(关系宫位相互吸引、容易绑定)";
  else if (CHONG[aBranch] === bBranch) branchRel = "相冲(亲密宫位互相拉动,聚散张力明显)";
  else if (ZHI_WUXING[aBranch] === ZHI_WUXING[bBranch]) branchRel = "比和(同气,相处节奏相近)";
  const lines = [
    `${nameA}夫妻宫坐${aBranch}(本气${aMain},${jA.anchors.dayMaster}日主视角下为${tenGodOf(jA.anchors.dayMaster, aMain)});${nameB}夫妻宫坐${bBranch}(本气${bMain},${jB.anchors.dayMaster}日主视角下为${tenGodOf(jB.anchors.dayMaster, bMain)})。`,
    `双方日支${branchRel}。`,
    `互见:${nameB}日支本气${bMain}在${nameA}盘中为${aSeesB}——${nameA}体验到的${nameB}内核带着${aSeesB}的色彩;${nameA}日支本气${aMain}在${nameB}盘中为${bSeesA}——${nameB}体验到的${nameA}内核带着${bSeesA}的色彩。`,
  ];
  return lines.join("");
}

/** 喜忌互补定性:双向各判 互补/中性/互耗 三档(沿用计数逻辑,加定性结论) */
function wuxingComplement(jA: BaziJudgment, jB: BaziJudgment, nameA: string, nameB: string): string {
  const lines: string[] = [];
  const grade = (target: BaziJudgment, donor: BaziJudgment): { level: string; score: number } => {
    const complement = target.anchors.fuYong.favorable.reduce((sum, el) => sum + (donor.facts.wuXing[el] ?? 0), 0);
    const drain = target.anchors.fuYong.cautious.reduce((sum, el) => sum + (donor.facts.wuXing[el] ?? 0), 0);
    if (drain >= 3 && complement <= 1) return { level: "互耗", score: drain };
    if (complement >= 3 && drain <= 2) return { level: "互补", score: complement };
    return { level: "中性", score: complement };
  };
  const aFromB = grade(jA, jB);
  const bFromA = grade(jB, jA);
  for (const element of jA.anchors.fuYong.favorable) {
    const count = jB.facts.wuXing[element] ?? 0;
    if (count >= 2) lines.push(`${nameB}命中${element}${count}处,正是${nameA}的喜用,能实质补${nameA}`);
  }
  for (const element of jB.anchors.fuYong.favorable) {
    const count = jA.facts.wuXing[element] ?? 0;
    if (count >= 2) lines.push(`${nameA}命中${element}${count}处,正是${nameB}的喜用,能实质补${nameB}`);
  }
  for (const element of jA.anchors.fuYong.cautious) {
    const count = jB.facts.wuXing[element] ?? 0;
    if (count >= 3) lines.push(`${nameB}命中${element}${count}处,恰是${nameA}需节制的方向,易放大${nameA}的消耗`);
  }
  for (const element of jB.anchors.fuYong.cautious) {
    const count = jA.facts.wuXing[element] ?? 0;
    if (count >= 3) lines.push(`${nameA}命中${element}${count}处,恰是${nameB}需节制的方向,易放大${nameB}的消耗`);
  }
  lines.push(`定性:${nameA}从${nameB}处所得为「${aFromB.level}」;${nameB}从${nameA}处所得为「${bFromA.level}」。`);
  lines.push(`五行计数——${nameA}:${Object.entries(jA.facts.wuXing).map(([k, v]) => `${k}${v}`).join("、")};${nameB}:${Object.entries(jB.facts.wuXing).map(([k, v]) => `${k}${v}`).join("、")}。`);
  return lines.join(";");
}

/** 旺衰组合:双方七档 → 家族组合定性 */
function strengthCombo(jA: BaziJudgment, jB: BaziJudgment, nameA: string, nameB: string): string {
  const fa = jA.anchors.strength.family;
  const fb = jB.anchors.strength.family;
  const la = jA.anchors.strength.level;
  const lb = jB.anchors.strength.level;
  const combo =
    fa === "强" && fb === "强" ? "双强——两人都主见足,课题在主导权与让步空间"
      : fa === "弱" && fb === "弱" ? "双弱——都偏借力型,课题在外部支撑与相互托底"
        : (fa === "强" && fb === "弱") || (fa === "弱" && fb === "强") ? "强弱互补——传统互补结构,一方定方向一方给弹性"
          : `组合含中和/从势(${fa}/${fb})——节奏取决于各自顺势方向`;
  return `旺衰组合:${nameA}「${la}」(${fa}) × ${nameB}「${lb}」(${fb}) → ${combo}。`;
}

/** 逐年关系顺压信号:双方流年评分对照 + 流年支与双方日支(夫妻宫)的冲合 */
function annualSync(jA: BaziJudgment, jB: BaziJudgment, nameA: string, nameB: string): AnnualSync[] {
  const aDay = jA.facts.pillars[2].ganzhi[1];
  const bDay = jB.facts.pillars[2].ganzhi[1];
  return jA.facts.annual.map((yearA, index) => {
    const yearB = jB.facts.annual[index];
    if (!yearB || yearB.year !== yearA.year) return null;
    const signals: string[] = [];
    const branch = yearA.ganzhi[1];
    if (CHONG[branch] === aDay) signals.push(`流年支冲${nameA}夫妻宫`);
    if (CHONG[branch] === bDay) signals.push(`流年支冲${nameB}夫妻宫`);
    if (LIU_HE[branch] === aDay) signals.push(`流年支合${nameA}夫妻宫`);
    if (LIU_HE[branch] === bDay) signals.push(`流年支合${nameB}夫妻宫`);
    const bothGood = yearA.score >= 65 && yearB.score >= 65;
    const bothBad = yearA.score <= 48 && yearB.score <= 48;
    const split = Math.abs(yearA.score - yearB.score) >= 20;
    if (bothGood) signals.push("双方流年同顺");
    if (bothBad) signals.push("双方流年同压");
    if (split) signals.push(yearA.score > yearB.score ? `${nameA}顺而${nameB}压,节奏错位` : `${nameB}顺而${nameA}压,节奏错位`);
    if (yearA.liChunNote) signals.push(yearA.liChunNote);
    const tone: AnnualSync["tone"] = bothGood && !signals.some((s) => s.includes("冲")) ? "good" : bothBad || signals.some((s) => s.includes("冲")) ? "caution" : "neutral";
    return {
      year: yearA.year,
      ganzhi: yearA.ganzhi,
      aScore: yearA.score,
      bScore: yearB.score,
      signals,
      tone,
      note: `${yearA.year}${yearA.ganzhi}年:${nameA}参考分${yearA.score}、${nameB}参考分${yearB.score}${signals.length ? ";" + signals.join(";") : ";双方均无明显强信号"}`,
    };
  }).filter((item): item is AnnualSync => item !== null);
}

export function buildDualJudgment(chartA: BaziChart, chartB: BaziChart, nameA: string, nameB: string): DualBaziJudgment {
  const judgmentA = buildBaziJudgment(chartA, buildBaziLifeProfile(chartA));
  const judgmentB = buildBaziJudgment(chartB, buildBaziLifeProfile(chartB));

  // 日主生克方向(沿用既有口径)
  const aEl = judgmentA.anchors.dayElement;
  const bEl = judgmentB.anchors.dayElement;
  const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  const aDay = judgmentA.anchors.dayMaster;
  const bDay = judgmentB.anchors.dayMaster;
  const dayMasterText = aEl === bEl
    ? `日主关系:${nameA}(${aDay})与${nameB}(${bDay})同为${aEl},比和(同气相求,也同强同弱)`
    : SHENG[aEl] === bEl
      ? `日主关系:${nameA}(${aDay}/${aEl})生${nameB}(${bDay}/${bEl})——${nameA}天然付出/滋养一方,${nameB}天然接收一方`
      : SHENG[bEl] === aEl
        ? `日主关系:${nameB}(${bDay}/${bEl})生${nameA}(${aDay}/${aEl})——${nameB}天然付出/滋养一方,${nameA}天然接收一方`
        : KE[aEl] === bEl
          ? `日主关系:${nameA}(${aDay}/${aEl})克${nameB}(${bDay}/${bEl})——${nameA}天然主导/约束一方`
          : `日主关系:${nameB}(${bDay}/${bEl})克${nameA}(${aDay}/${aEl})——${nameB}天然主导/约束一方`;

  const cross = crossScan(chartA, chartB, nameA, nameB);
  const spousePalaceText = spousePalace(judgmentA, judgmentB, nameA, nameB);
  const wuxingComplementText = wuxingComplement(judgmentA, judgmentB, nameA, nameB);
  const strengthComboText = strengthCombo(judgmentA, judgmentB, nameA, nameB);
  const sync = annualSync(judgmentA, judgmentB, nameA, nameB);
  const annualRange = sync.length ? `${sync[0].year}–${sync[sync.length - 1].year}` : "";

  const personFact = (label: string, person: DualPerson) => [
    `${label} 四柱:${person.pillars.map((p) => p.ganzhi).join(" ")} | 日主${person.dayMaster}(${person.dayElement},${person.yinYang}干)`,
    `${label} 旺衰:「${person.strengthLevel}」 | 格局:「${person.patternName}」(${person.patternTier})`,
    `${label} 喜用:${person.favorable.join("、")} | 忌:${person.cautious.join("、")} | 调候:${person.tiaoHouState}`,
    `${label} 十神排序:${person.tenGodsText}`,
    `${label} ${person.spouseStarText}`,
  ];

  const evidence: DualEvidence[] = [
    ...personFact(nameA, personOf(nameA, chartA, judgmentA)).map((fact, index) => ({ id: `person.A.${index + 1}`, fact, source: "bazi-engine" as const })),
    ...personFact(nameB, personOf(nameB, chartB, judgmentB)).map((fact, index) => ({ id: `person.B.${index + 1}`, fact, source: "bazi-engine" as const })),
    { id: "relation.daymaster", fact: dayMasterText, source: "bazi-engine" },
    ...cross.texts.map((fact, index) => ({ id: `relation.cross-${index + 1}`, fact, source: "bazi-engine" as const })),
    { id: "relation.spouse-palace", fact: spousePalaceText, source: "bazi-engine" },
    { id: "relation.wuxing", fact: wuxingComplementText, source: "bazi-engine" },
    { id: "relation.strength-combo", fact: strengthComboText, source: "bazi-engine" },
    ...sync.map((item) => ({ id: `relation.annual-${item.year}`, fact: item.note, source: "bazi-engine" as const })),
    { id: "relation.dayun-a", fact: `${nameA}大运:${judgmentA.facts.dayun.map((d) => `${d.ganzhi}(${d.ageText}${d.current ? ",当前" : ""})`).join("、")}`, source: "bazi-engine" },
    { id: "relation.dayun-b", fact: `${nameB}大运:${judgmentB.facts.dayun.map((d) => `${d.ganzhi}(${d.ageText}${d.current ? ",当前" : ""})`).join("、")}`, source: "bazi-engine" },
  ];

  return {
    meta: { nameA, nameB, genderA: chartA.gender, genderB: chartB.gender, hasHour: Boolean(chartA.pillars[3] && chartB.pillars[3]) },
    persons: {
      A: personOf(nameA, chartA, judgmentA),
      B: personOf(nameB, chartB, judgmentB),
    },
    relation: {
      dayMasterText,
      crossRelations: cross.hits,
      crossRelationTexts: cross.texts,
      spousePalaceText,
      wuxingComplementText,
      strengthComboText,
      annualSync: sync,
      annualRange,
    },
    evidence,
  };
}

/** 双方十神互见的快捷取数(供 prompt 的「十神互见」章节) */
export function tenGodMutualView(judgment: DualBaziJudgment): string {
  const aDay = judgment.persons.A.dayMaster;
  const bDay = judgment.persons.B.dayMaster;
  const aSeesBDayMaster = tenGodOf(aDay, bDay);
  const bSeesADayMaster = tenGodOf(bDay, aDay);
  const aCategory = elementCategoryOf(aDay, GAN_WUXING[bDay]);
  const bCategory = elementCategoryOf(bDay, GAN_WUXING[aDay]);
  return `${judgment.meta.nameB}的日主${bDay}在${judgment.meta.nameA}眼中是「${aSeesBDayMaster}」(${aCategory},初始滤镜偏${aCategory === "比劫" ? "同类自己人" : aCategory === "印星" ? "可靠师长" : aCategory === "食伤" ? "鲜活有趣" : aCategory === "财星" ? "务实吸引" : "敬畏约束"});${judgment.meta.nameA}的日主${aDay}在${judgment.meta.nameB}眼中是「${bSeesADayMaster}」(${bCategory},初始滤镜偏${bCategory === "比劫" ? "同类自己人" : bCategory === "印星" ? "可靠师长" : bCategory === "食伤" ? "鲜活有趣" : bCategory === "财星" ? "务实吸引" : "敬畏约束"})。`;
}

function elementCategoryOf(dayMaster: string, element: string): TenGodCategory {
  const day = GAN_WUXING[dayMaster];
  const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (day === element) return "比劫";
  if (SHENG[day] === element) return "食伤";
  if (KE[day] === element) return "财星";
  if (KE[element] === day) return "官杀";
  return "印星";
}

/** 支的五行导出(供 prompt 引用) */
export { ZHI_WUXING };
