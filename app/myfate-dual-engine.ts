// 双星合盘结构引擎:只消费两人各自的确定性八字排盘,计算交叉互动结构。
// 维度:日主/十神双向、天干五合、地支六合冲害刑破、三合三会、藏干互动、
// 柱位权重、身强身弱喜忌互济、当前大运与未来流年窗口;评分确定性产出,AI 只翻译。
import { buildBaziChart, type BaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile, type BaziLifeProfile } from "./myfate-bazi-profile";
import type { CelebrityVedicBirth } from "./myfate-stars-server";

type Element = "木" | "火" | "土" | "金" | "水";
type Confidence = "strong" | "medium" | "light";
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
const ELEMENT_NATURE: Record<Element, string> = { 木: "生长与规划", 火: "表达与热度", 土: "稳定与承载", 金: "判断与边界", 水: "洞察与流动" };
const POS_MEANING = ["年柱·社会背景层", "月柱·事业互动层", "日柱·亲密核心层", "时柱·长远深层"];
const POS_WEIGHT = [0.8, 1, 1.4, 1];

function tenGod(day: string, other: string): string {
  const d = GAN_WUXING[day], o = GAN_WUXING[other];
  const samePolarity = GAN.indexOf(day) % 2 === GAN.indexOf(other) % 2;
  if (d === o) return samePolarity ? "比肩" : "劫财";
  if (SHENG[d] === o) return samePolarity ? "食神" : "伤官";
  if (KE[d] === o) return samePolarity ? "偏财" : "正财";
  if (KE[o] === d) return samePolarity ? "七杀" : "正官";
  return samePolarity ? "偏印" : "正印";
}

function elementRelation(a: Element, b: Element) {
  if (a === b) return "同类并行";
  if (SHENG[a] === b) return `${a}生${b}`;
  if (SHENG[b] === a) return `${b}生${a}`;
  if (KE[a] === b) return `${a}克${b}`;
  return `${b}克${a}`;
}

export type DualStructure = {
  starA: { name: string; dayMaster: string; dayElement: Element; strength: string; pattern: string; favorable: Element[]; cautious: Element[]; pillars: string[] };
  starB: { name: string; dayMaster: string; dayElement: Element; strength: string; pattern: string; favorable: Element[]; cautious: Element[]; pillars: string[] };
  dayMasterBidirectional: { aToB: string; bToA: string };
  ganCombinations: string[];
  branchInteractions: Array<{ type: string; aPos: number; bPos: number; aZhi: string; bZhi: string; meaning: string; confidence: Confidence }>;
  combinations: Array<{ type: string; branches: string[]; meaning: string; confidence: Confidence }>;
  hiddenGods: Array<{ side: "A→B" | "B→A"; pos: string; hidden: string; god: string }>;
  spousePalace: { text: string; confidence: Confidence };
  elementBalance: { text: string; aNourished: number; bNourished: number };
  strengthNote: string;
  luckWindow: Array<{ year: number; ganzhi: string; event: string; confidence: Confidence }>;
  finalScores: { overall: number; attraction: number; communication: number; emotion: number; cooperation: number; conflict: number; longevity: number };
};

export function buildDualStructure(
  birthA: CelebrityVedicBirth, birthB: CelebrityVedicBirth,
  chartA: BaziChart, chartB: BaziChart,
  profileA: BaziLifeProfile, profileB: BaziLifeProfile,
  currentYear = new Date().getFullYear(),
): DualStructure {
  const branchesA = chartA.pillars.map((p) => p.ganzhi[1]);
  const branchesB = chartB.pillars.map((p) => p.ganzhi[1]);
  const all = [...branchesA, ...branchesB];
  const interactions: DualStructure["branchInteractions"] = [];
  const combinations: DualStructure["combinations"] = [];

  const MEANING: Record<string, string> = {
    六合: "相关领域容易彼此配合、互相吸引",
    相冲: "相关领域节奏拉扯明显,变化感强",
    相害: "相关领域容易产生隐性消耗与误会",
    相破: "相关领域计划容易被细节打断",
  };
  const CONF: Record<string, Confidence> = { 六合: "strong", 相冲: "strong", 相害: "medium", 相破: "light" };
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      const a = branchesA[i], b = branchesB[j];
      for (const [type, table] of [["六合", LIU_HE], ["相冲", CHONG], ["相害", HAI], ["相破", PO]] as const) {
        if (table[a] === b) {
          interactions.push({ type, aPos: i, bPos: j, aZhi: a, bZhi: b, meaning: `${POS_MEANING[i]}与${POS_MEANING[j]}之间${MEANING[type]}`, confidence: CONF[type] });
        }
      }
    }
  }

  // 三合局(跨两人支凑齐三支成立;两支为半合)
  const SAN_HE: Array<[string, string, string, Element]> = [["申", "子", "辰", "水"], ["寅", "午", "戌", "火"], ["巳", "酉", "丑", "金"], ["亥", "卯", "未", "木"]];
  for (const [x, y, z, el] of SAN_HE) {
    const hits = all.filter((b) => b === x || b === y || b === z);
    const pairFromBoth = hits.length >= 2 && branchesA.some((b) => [x, y, z].includes(b)) && branchesB.some((b) => [x, y, z].includes(b));
    if (pairFromBoth && hits.length >= 2) {
      const full = hits.length >= 3 && new Set(hits).size >= 3;
      combinations.push({ type: full ? `${el}局三合` : `${el}局半合`, branches: [...new Set(hits)], meaning: full ? `两人合力凑齐${el}局三合,${ELEMENT_NATURE[el]}的能量在这段关系中被显著放大` : `两人支形成${el}局半合,${ELEMENT_NATURE[el]}的默契有结构支撑`, confidence: full ? "strong" : "medium" });
    }
  }
  // 三会(寅卯辰/巳午未/申酉戌/亥子丑)
  const SAN_HUI: Array<[string, string, string, Element]> = [["寅", "卯", "辰", "木"], ["巳", "午", "未", "火"], ["申", "酉", "戌", "金"], ["亥", "子", "丑", "水"]];
  for (const [x, y, z, el] of SAN_HUI) {
    const set = new Set([x, y, z]);
    if (set.has(...[branchesA.find((b) => set.has(b)) ?? ""]) && [...all].filter((b) => set.has(b)).length >= 2 && branchesA.some((b) => set.has(b)) && branchesB.some((b) => set.has(b)) && new Set(all.filter((b) => set.has(b))).size >= 2) {
      combinations.push({ type: `${el}方三会`, branches: [...new Set(all.filter((b) => set.has(b)))], meaning: `两人支会成${el}方,${ELEMENT_NATURE[el]}气质相互加强`, confidence: "medium" });
    }
  }
  // 刑(无恩/恃势跨盘,自刑为同支在两人各现)
  const XING_GROUPS = [["寅", "巳", "申"], ["丑", "戌", "未"]];
  for (const group of XING_GROUPS) {
    const set = new Set(group);
    const aHit = branchesA.filter((b) => set.has(b));
    const bHit = branchesB.filter((b) => set.has(b));
    if (aHit.length && bHit.length) {
      combinations.push({ type: "相刑", branches: [...new Set([...aHit, ...bHit])], meaning: "两人支构成刑局,内在要求高、摩擦与磨合并存,压力需要稳定出口", confidence: "medium" });
    }
  }
  for (const zhi of ["辰", "午", "酉", "亥"]) {
    if (branchesA.includes(zhi) && branchesB.includes(zhi)) {
      combinations.push({ type: "自刑", branches: [zhi], meaning: `两支同见${zhi}成自刑,双方容易在同类议题上互相较劲`, confidence: "light" });
    }
  }

  const ganCombos: string[] = [];
  for (const ganA of chartA.pillars.map((p) => p.ganzhi[0])) {
    for (const ganB of chartB.pillars.map((p) => p.ganzhi[0])) {
      if (GAN_HE[ganA] === ganB) ganCombos.push(`${ganA}与${ganB}天干相合`);
    }
  }

  // 藏干十神双向:A 的藏干对 B 日主呈现的十神 = A 向 B 输出的能量性质
  const hiddenGods: DualStructure["hiddenGods"] = [];
  const dayA = chartA.dayMaster, dayB = chartB.dayMaster;
  for (let i = 0; i < 4; i += 1) {
    for (const hidden of chartA.pillars[i].hideGan) hiddenGods.push({ side: "A→B", pos: POS_MEANING[i], hidden, god: tenGod(dayB, hidden) });
    for (const hidden of chartB.pillars[i].hideGan) hiddenGods.push({ side: "B→A", pos: POS_MEANING[i], hidden, god: tenGod(dayA, hidden) });
  }

  const dayElA = GAN_WUXING[dayA], dayElB = GAN_WUXING[dayB];
  const aToB = `${dayA}(${dayElA})对${dayB}:B 视 A 的日主为「${tenGod(dayB, dayA)}」,A 向 B 输送${ELEMENT_NATURE[dayElA]}性质的能量(${elementRelation(dayElA, dayElB)})`;
  const bToA = `${dayB}(${dayElB})对${dayA}:A 视 B 的日主为「${tenGod(dayA, dayB)}」,B 向 A 输送${ELEMENT_NATURE[dayElB]}性质的能量(${elementRelation(dayElB, dayElA)})`;

  const spouseA = branchesA[2], spouseB = branchesB[2];
  let spousePalace: DualStructure["spousePalace"];
  if (CHONG[spouseA] === spouseB) spousePalace = { text: `A 日支 ${spouseA} 与 B 日支 ${spouseB} 相冲,亲密相处节奏调整感强,空间与边界议题反复出现`, confidence: "strong" };
  else if (LIU_HE[spouseA] === spouseB) spousePalace = { text: `A 日支 ${spouseA} 与 B 日支 ${spouseB} 六合,内在需求容易相互呼应,亲近感有结构支撑`, confidence: "strong" };
  else if (HAI[spouseA] === spouseB) spousePalace = { text: `A 日支 ${spouseA} 与 B 日支 ${spouseB} 相害,亲近中容易积累小误会,需要直接沟通`, confidence: "medium" };
  else if (PO[spouseA] === spouseB) spousePalace = { text: `A 日支 ${spouseA} 与 B 日支 ${spouseB} 相破,日常相处容易被琐事打断节奏`, confidence: "light" };
  else spousePalace = { text: `A 日支 ${spouseA} 与 B 日支 ${spouseB} 无明显合冲,亲密宫位平稳,关系质量更多取决于大运与相处方式`, confidence: "medium" };

  // 喜忌互济:B 命局五行含量对 A 喜用的供给强度
  const nourish = (favorable: Element[], chart: BaziChart) => Math.min(100, favorable.reduce((sum, el) => sum + chart.wuXing[el], 0) * 22);
  const aNourished = nourish(profileA.summary.favorable, chartB);
  const bNourished = nourish(profileB.summary.favorable, chartA);
  const strengthNote = `A 命局${profileA.summary.strength}、B 命局${profileB.summary.strength};${profileA.summary.strength === profileB.summary.strength ? "两人强弱同频,节奏感接近" : "一强一弱,强弱互补与不对等并存"}`;
  const elementBalance = {
    text: `B 的五行结构对 A 喜用(${profileA.summary.favorable.join("、")})供给度约 ${aNourished}%;A 对 B 喜用(${profileB.summary.favorable.join("、")})供给度约 ${bNourished}%。${aNourished >= 45 && bNourished >= 45 ? "互济明显,天然互补。" : aNourished >= 45 ? "B 对 A 的滋养更明显,A 在关系中更容易被托举。" : bNourished >= 45 ? "A 对 B 的滋养更明显,B 在关系中更容易被托举。" : "互济一般,相处更依赖自觉磨合。"}`,
    aNourished, bNourished,
  };

  // 关系窗口:未来三年流年支与对方日支的合冲 + 两人当前大运
  const yearGanZhi = (year: number) => { const index = ((year - 1984) % 60 + 60) % 60; return GAN[index % 10] + "子丑寅卯辰巳午未申酉戌亥"[index % 12]; };
  const dayunA = chartA.daYun.steps.find((s) => s.current);
  const dayunB = chartB.daYun.steps.find((s) => s.current);
  const luckWindow: DualStructure["luckWindow"] = [];
  if (dayunA || dayunB) {
    luckWindow.push({
      year: currentYear, ganzhi: `${dayunA?.ganzhi ?? "?"} / ${dayunB?.ganzhi ?? "?"}`,
      event: `A 当前行${dayunA?.ganzhi ?? "?"}大运,B 当前行${dayunB?.ganzhi ?? "?"}大运,两人的阶段背景由此展开`,
      confidence: "medium",
    });
  }
  for (let i = 0; i < 3; i += 1) {
    const year = currentYear + i;
    const zhi = yearGanZhi(year)[1];
    const hits: string[] = [];
    if (CHONG[zhi] === spouseA) hits.push(`流年支${zhi}冲 A 日支`);
    if (LIU_HE[zhi] === spouseA) hits.push(`流年支${zhi}合 A 日支`);
    if (CHONG[zhi] === spouseB) hits.push(`流年支${zhi}冲 B 日支`);
    if (LIU_HE[zhi] === spouseB) hits.push(`流年支${zhi}合 B 日支`);
    if (hits.length) luckWindow.push({ year, ganzhi: yearGanZhi(year), event: hits.join("、") + ",关系节奏在该年变化感更明显", confidence: "medium" });
  }

  // 评分(引擎唯一来源):柱位加权信号汇总
  const weighted = (type: string) => interactions.filter((x) => x.type === type).reduce((sum, x) => sum + POS_WEIGHT[Math.max(x.aPos, x.bPos)], 0);
  const heW = weighted("六合"), chongW = weighted("相冲"), haiW = weighted("相害"), poW = weighted("相破");
  const sanHeW = combinations.filter((c) => c.type.includes("三合")).length;
  const xingW = combinations.filter((c) => c.type.includes("刑")).length;
  const nourishAvg = (aNourished + bNourished) / 2;
  const clamp = (v: number) => Math.max(35, Math.min(88, Math.round(v)));
  const attraction = clamp(58 + ganCombos.length * 7 + (spousePalace.text.includes("六合") ? 10 : 0) + sanHeW * 5 + (elementBalance.text.includes("互济") ? 6 : 0) - (spousePalace.text.includes("相冲") ? 6 : 0));
  const communication = clamp(56 + (dayElA === dayElB ? 8 : 0) + ganCombos.length * 5 + heW * 3 - haiW * 5);
  const emotion = clamp(56 + (spousePalace.text.includes("六合") ? 11 : 0) + heW * 4 + nourishAvg * 0.1 - (spousePalace.text.includes("相冲") ? 9 : 0));
  const cooperation = clamp(56 + nourishAvg * 0.18 + sanHeW * 6 - chongW * 4);
  const conflict = clamp(46 + chongW * 7 + haiW * 5 + xingW * 4 - heW * 3 - sanHeW * 3);
  const longevity = clamp(56 + heW * 3 + sanHeW * 4 + nourishAvg * 0.12 - chongW * 5);
  const overall = clamp(attraction * 0.2 + communication * 0.15 + emotion * 0.2 + cooperation * 0.15 + (100 - conflict) * 0.15 + longevity * 0.15);

  return {
    starA: {
      name: birthA.name, dayMaster: dayA, dayElement: dayElA, strength: profileA.summary.strength,
      pattern: profileA.summary.pattern, favorable: profileA.summary.favorable, cautious: profileA.summary.cautious,
      pillars: chartA.pillars.map((p) => p.ganzhi),
    },
    starB: {
      name: birthB.name, dayMaster: dayB, dayElement: dayElB, strength: profileB.summary.strength,
      pattern: profileB.summary.pattern, favorable: profileB.summary.favorable, cautious: profileB.summary.cautious,
      pillars: chartB.pillars.map((p) => p.ganzhi),
    },
    dayMasterBidirectional: { aToB, bToA },
    ganCombinations: ganCombos,
    branchInteractions: interactions,
    combinations,
    hiddenGods: hiddenGods.slice(0, 16),
    spousePalace,
    elementBalance,
    strengthNote,
    luckWindow: luckWindow.slice(0, 5),
    finalScores: { overall, attraction, communication, emotion, cooperation, conflict, longevity },
  };
}

export function buildDualChart(birth: CelebrityVedicBirth) {
  const chart = buildBaziChart({
    birthDate: birth.birthDate,
    birthTime: birth.birthTime || "12:00",
    gender: birth.gender === "female" ? "female" : "male",
    city: { id: birth.starId, name: birth.birthPlace, lat: birth.lat, lon: birth.lon, tz: birth.tz },
  });
  return { chart, profile: buildBaziLifeProfile(chart) };
}
