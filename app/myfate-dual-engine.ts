// 双星合盘结构引擎:只消费两人各自的确定性八字排盘,计算交叉互动结构。
// 结构事实供 AI 翻译成报告文案;分数仅为结构信号的相对趋势,不是现实关系结论。
import { buildBaziChart, type BaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile, type BaziLifeProfile } from "./myfate-bazi-profile";
import type { CelebrityVedicBirth } from "./myfate-stars-server";

type Element = "木" | "火" | "土" | "金" | "水";
const GAN_WUXING: Record<string, Element> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const ZHI_WUXING: Record<string, Element> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
const SHENG: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const LIU_HE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const CHONG: Record<string, string> = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const HAI: Record<string, string> = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
const GAN_HE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
const ELEMENT_NATURE: Record<Element, string> = {
  木: "生长与规划", 火: "表达与热度", 土: "稳定与承载", 金: "判断与边界", 水: "洞察与流动",
};

export type DualStructure = {
  starA: { name: string; dayMaster: string; dayElement: Element; strength: string; pattern: string; favorable: Element[]; pillars: string[] };
  starB: { name: string; dayMaster: string; dayElement: Element; strength: string; pattern: string; favorable: Element[]; pillars: string[] };
  dayMasterRelation: string;
  ganCombinations: string[];
  branchInteractions: Array<{ type: string; aPos: string; bPos: string; aZhi: string; bZhi: string }>;
  spousePalace: string;
  elementBalance: string;
  basisScores: { attraction: number; communication: number; emotion: number; cooperation: number; conflict: number; longevity: number };
};

function elementRelation(a: Element, b: Element) {
  if (a === b) return "同类并行";
  if (SHENG[a] === b) return `${a}生${b}`;
  if (SHENG[b] === a) return `${b}生${a}`;
  if (KE[a] === b) return `${a}克${b}`;
  return `${b}克${a}`;
}

export function buildDualStructure(
  birthA: CelebrityVedicBirth, birthB: CelebrityVedicBirth,
  chartA: BaziChart, chartB: BaziChart,
  profileA: BaziLifeProfile, profileB: BaziLifeProfile,
): DualStructure {
  const pillarsOf = (chart: BaziChart) => chart.pillars.map((p) => p.ganzhi);
  const branchesA = chartA.pillars.map((p) => p.ganzhi[1]);
  const branchesB = chartB.pillars.map((p) => p.ganzhi[1]);
  const posLabel = ["年柱", "月柱", "日柱", "时柱"];

  const interactions: DualStructure["branchInteractions"] = [];
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      const a = branchesA[i], b = branchesB[j];
      if (CHONG[a] === b) interactions.push({ type: "相冲", aPos: posLabel[i], bPos: posLabel[j], aZhi: a, bZhi: b });
      else if (LIU_HE[a] === b) interactions.push({ type: "六合", aPos: posLabel[i], bPos: posLabel[j], aZhi: a, bZhi: b });
      else if (HAI[a] === b) interactions.push({ type: "相害", aPos: posLabel[i], bPos: posLabel[j], aZhi: a, bZhi: b });
    }
  }

  const ganCombos: string[] = [];
  for (const ganA of chartA.pillars.map((p) => p.ganzhi[0])) {
    for (const ganB of chartB.pillars.map((p) => p.ganzhi[0])) {
      if (GAN_HE[ganA] === ganB) ganCombos.push(`${ganA}与${ganB}天干相合`);
    }
  }

  const dayElA = GAN_WUXING[chartA.dayMaster];
  const dayElB = GAN_WUXING[chartB.dayMaster];
  const dmRelation = `${chartA.dayMaster}(${dayElA})与${chartB.dayMaster}(${dayElB})日主关系为「${elementRelation(dayElA, dayElB)}」`;

  // 夫妻宫(日支)互动
  const spouseA = branchesA[2], spouseB = branchesB[2];
  let spousePalace = `A 日支 ${spouseA} 与 B 日支 ${spouseB} 无明显合冲，关系宫位平稳。`;
  if (CHONG[spouseA] === spouseB) spousePalace = `A 日支 ${spouseA} 与 B 日支 ${spouseB} 相冲，亲密与相处节奏的调整感较强。`;
  else if (LIU_HE[spouseA] === spouseB) spousePalace = `A 日支 ${spouseA} 与 B 日支 ${spouseB} 六合，内在需求容易相互呼应。`;
  else if (HAI[spouseA] === spouseB) spousePalace = `A 日支 ${spouseA} 与 B 日支 ${spouseB} 相害，需要留意隐性消耗与误会。`;

  // 五行互补:B 的旺元素是否是 A 的喜用,反之
  const topOf = (chart: BaziChart) => (Object.entries(chart.wuXing).sort((x, y) => y[1] - x[1])[0][0] as Element);
  const topA = topOf(chartA), topB = topOf(chartB);
  const aFavorsB = profileA.summary.favorable.includes(topB);
  const bFavorsA = profileB.summary.favorable.includes(topA);
  const elementBalance = `A 命局最旺为${topA}(${ELEMENT_NATURE[topA]}),B 最旺为${topB}(${ELEMENT_NATURE[topB]})。`
    + (aFavorsB && bFavorsA ? "双方旺气互为对方喜用,能量互补明显。"
      : aFavorsB ? `B 的${topB}之气恰好补 A 所需,A 在这段关系中容易获得滋养。`
      : bFavorsA ? `A 的${topA}之气恰好补 B 所需,B 在这段关系中容易获得滋养。`
      : "双方旺气不互为对方喜用,相处更依赖自觉磨合而非天然互补。");

  // 结构信号 → 相对趋势分(仅供 AI 对齐语感,报告内标注为相对趋势)
  const heCount = interactions.filter((x) => x.type === "六合").length;
  const chongCount = interactions.filter((x) => x.type === "相冲").length;
  const haiCount = interactions.filter((x) => x.type === "相害").length;
  const score = (base: number, delta: number) => Math.max(35, Math.min(88, base + delta));
  const attraction = score(62, (ganCombos.length ? 8 : 0) + (spousePalace.includes("六合") ? 8 : 0) + (aFavorsB || bFavorsA ? 6 : 0) - (spousePalace.includes("相冲") ? 6 : 0));
  const communication = score(60, (dayElA === dayElB ? 8 : 0) + (ganCombos.length ? 6 : 0) - (haiCount * 4));
  const emotion = score(60, (spousePalace.includes("六合") ? 10 : 0) + heCount * 3 - (spousePalace.includes("相冲") ? 8 : 0));
  const cooperation = score(60, (aFavorsB && bFavorsA ? 12 : aFavorsB || bFavorsA ? 6 : 0) - chongCount * 3);
  const conflict = score(48, chongCount * 6 + haiCount * 4 - heCount * 3);
  const longevity = score(58, heCount * 3 + (aFavorsB || bFavorsA ? 5 : 0) - chongCount * 4);

  return {
    starA: {
      name: birthA.name, dayMaster: chartA.dayMaster, dayElement: dayElA,
      strength: profileA.summary.strength, pattern: profileA.summary.pattern,
      favorable: profileA.summary.favorable, pillars: pillarsOf(chartA),
    },
    starB: {
      name: birthB.name, dayMaster: chartB.dayMaster, dayElement: dayElB,
      strength: profileB.summary.strength, pattern: profileB.summary.pattern,
      favorable: profileB.summary.favorable, pillars: pillarsOf(chartB),
    },
    dayMasterRelation: dmRelation,
    ganCombinations: ganCombos,
    branchInteractions: interactions,
    spousePalace,
    elementBalance,
    basisScores: { attraction, communication, emotion, cooperation, conflict, longevity },
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
