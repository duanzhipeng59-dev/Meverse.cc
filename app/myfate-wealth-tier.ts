// 财富 T 档的确定性计算(引擎定档,AI 只照链叙述,不参与运算):
// 输入排盘与画像的引擎信号(十神权重/藏干透干/喜忌/大运),输出唯一档位、
// 金额区间与完整推导链。同一盘面永远同值;分布可用阈值调参(先跑
// scripts/wealth-tier-distribution.mjs 看存量分布再调)。
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";

// 八档全覆盖(补上旧表缺失的 T7;中段细分,避免千人一面挤在同一区间)
export const WEALTH_TIERS = {
  T8: "100万-300万",
  T7: "300万-700万",
  T6: "700万-1500万",
  T5: "1500万-3000万",
  T4: "3000万-5000万",
  T3: "5000万-7000万",
  T2: "7000万-1亿",
  T1: "1亿以上",
} as const;

export type WealthTierKey = keyof typeof WEALTH_TIERS;
const TIER_ORDER: WealthTierKey[] = ["T8", "T7", "T6", "T5", "T4", "T3", "T2", "T1"];

export type WealthTierAdjustment = { label: string; delta: number };
export type WealthTierResult = {
  tier: WealthTierKey;
  range: string;
  /** 基准分(0-100):财星结构×身强弱匹配度,不含大运 */
  baseScore: number;
  baseReason: string;
  adjustments: WealthTierAdjustment[];
  /** 叙述用推导链(简体,AI 原样引用) */
  chain: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function computeWealthTier(chart: BaziChart, profile: BaziLifeProfile): WealthTierResult {
  const tenGod = (name: string) => profile.tenGods.find((item) => item.name === name)?.value ?? 0;
  const wealthWeight = tenGod("财星");
  const outputWeight = tenGod("食伤");
  const peerWeight = tenGod("比劫");
  const sealWeight = tenGod("印星");
  const strength = profile.summary.strength;
  const isStrong = strength.includes("身强") || strength.includes("旺");
  const isFrom = strength.includes("从");

  // 财星透干/通根:天干见正财偏财 +1,地支藏干见 +0.5(月支/日支的财根更实再 +0.5)
  let roots = 0;
  const rootNotes: string[] = [];
  chart.pillars.forEach((pillar, index) => {
    if (/财/.test(pillar.shiShenGan)) { roots += 1; rootNotes.push(`${pillar.label}天干${pillar.shiShenGan}透出`); }
    pillar.hideShiShen.forEach((god, hideIndex) => {
      if (/财/.test(god)) {
        const solid = index === 1 || index === 2;
        roots += solid ? 0.6 : 0.4;
        if (solid && hideIndex === 0) rootNotes.push(`${pillar.label}本气藏${god}`);
      }
    });
  });

  // ── 基准分(0-100):结构决定,大运另算 ──
  // 财星权重 0-45(命理权重已含全局分布),食伤生财通道 0-20,
  // 身强弱匹配 0-20(身强担财/从势顺势都加分,身弱财重反而担不动),
  // 财根透藏 0-15。比劫与印星过旺扣分(夺财/耗财)。
  let score = 0;
  const parts: string[] = [];
  const wealthPart = clamp(wealthWeight / 2.2, 0, 1) * 45;
  score += wealthPart;
  parts.push(`财星权重${wealthWeight}`);

  const outputPart = outputWeight >= 0.6 && wealthWeight >= 0.8 ? clamp(outputWeight / 2, 0, 1) * 20 : Math.min(outputWeight, 1) * 6;
  score += outputPart;
  if (outputPart > 10) parts.push("食伤生财通道清晰");

  const matchPart = isFrom ? 20 : isStrong ? 16 + Math.min(roots, 2) * 2 : 6;
  score += matchPart;
  parts.push(isFrom ? "从势顺势" : isStrong ? "身强担财" : "身弱财难任");

  const rootPart = Math.min(roots, 4) / 4 * 15;
  score += rootPart;
  if (rootNotes.length) parts.push(rootNotes.slice(0, 2).join("、"));

  let penalty = 0;
  if (peerWeight >= 1.4) { penalty += Math.min((peerWeight - 1.4) * 12, 18); parts.push(`比劫权重${peerWeight}有夺财之嫌`); }
  if (!isStrong && !isFrom && sealWeight >= 1.6) { penalty += Math.min((sealWeight - 1.6) * 8, 10); parts.push("印重耗财"); }
  score -= penalty;

  score = clamp(score, 0, 100);

  // ── 大运修正(25-50 岁窗口,按喜用覆盖率)──
  const favorable = profile.summary.favorable;
  const cautious = profile.summary.cautious;
  const ganWuxingOf = (gan: string) => "木木火火土土金金水水"["甲乙丙丁戊己庚辛壬癸".indexOf(gan)] ?? "";
  const zhiWuxingOf = (zhi: string) => "水土木木土火火土金金土火"["子丑寅卯辰巳午未申酉戌亥".indexOf(zhi)] ?? "";
  const window = chart.daYun.steps.filter((step) => step.endAge >= 25 && step.startAge <= 50);
  const span = (step: { startAge: number; endAge: number }) =>
    Math.max(0, Math.min(step.endAge, 50) - Math.max(step.startAge, 25) + 1);
  const totalYears = window.reduce((sum, step) => sum + span(step), 0) || 1;
  let goodYears = 0;
  let drainYears = 0;
  window.forEach((step) => {
    const ganElement = ganWuxingOf(step.ganzhi[0]);
    const zhiElement = zhiWuxingOf(step.ganzhi[1]);
    const inFavor = favorable.some((el) => el === ganElement || el === zhiElement);
    const inCautious = cautious.some((el) => el === ganElement || el === zhiElement);
    const years = span(step);
    if (inFavor && !inCautious) goodYears += years;
    else if (inCautious && !inFavor) drainYears += years;
  });
  const adjustments: WealthTierAdjustment[] = [];
  const goodRatio = goodYears / totalYears;
  const drainRatio = drainYears / totalYears;
  if (goodRatio >= 0.55) {
    const delta = goodRatio >= 0.8 ? 1.5 : 1;
    adjustments.push({ label: `25-50岁喜用大运覆盖${Math.round(goodRatio * 100)}%（财源有持续推力）`, delta });
  }
  if (drainRatio >= 0.55) {
    const delta = drainRatio >= 0.8 ? -2 : -1;
    adjustments.push({ label: `25-50岁印比忌神大运占${Math.round(drainRatio * 100)}%（夺财逆势）`, delta });
  }

  // ── 分数与档位映射(可按分布统计调参的唯一一处)──
  // 分数带 → 基准档;大运修正按整档平移,再夹在 T1-T8。
  const scoreBand: Array<[number, WealthTierKey]> = [
    [93, "T1"], [88, "T2"], [82, "T3"], [74, "T4"],
    [63, "T5"], [49, "T6"], [30, "T7"], [0, "T8"],
  ];
  const baseTier = scoreBand.find(([min]) => score >= min)![1];
  const baseIndex = TIER_ORDER.indexOf(baseTier);
  const shift = adjustments.reduce((sum, item) => sum + item.delta, 0);
  const finalIndex = clamp(baseIndex - Math.round(shift), 0, TIER_ORDER.length - 1);
  const tier = TIER_ORDER[finalIndex];

  const baseReason = `引擎基准分${Math.round(score)}/100（${parts.join("；")}）→ 基准${baseTier}档`;
  const chain = [
    baseReason,
    ...adjustments.map((item) => `${item.delta > 0 ? "+" : ""}${item.delta}档：${item.label}`),
    `综合落位 ${tier} 档（${WEALTH_TIERS[tier]}）`,
  ].join("；");

  return { tier, range: WEALTH_TIERS[tier], baseScore: Math.round(score), baseReason, adjustments, chain };
}
