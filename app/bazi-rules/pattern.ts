// ── 格局判定(个人报告 V3,确定性) ──────────────────────────────────────
// 主流子平口径:以月令藏干透干取格——本气透 > 中气透 > 余气透 > 月令本气藏而不透;
// 月令为日主临官(禄) → 建禄格,月令为阳干帝旺(刃) → 阳刃格;
// 从格(从强/从弱)按主导之势命名(从旺/从财/从杀/从儿/从势)。
// 格局只描述命局的组织方式,不直接等同富贵贫贱;月令逢冲只提示根基受动,不断破格。

import type { BaziChart } from "../myfate-bazi-engine";
import { LU_OF, REN_OF, ZHI_HIDDEN, isYangGan, tenGodOf, type TenGodCategory } from "./constants";
import { tenGodWeightsOf, type StrengthResult } from "./strength";

export type PatternTier = "本气透出" | "中气透出" | "余气透出" | "藏而不透" | "从格取势";

export type PatternResult = {
  /** 格局名(含"格"字,如「正官格」「建禄格」「从财格」) */
  name: string;
  tier: PatternTier;
  /** 从格标记(null = 普通格局) */
  special: null | "从旺" | "从财" | "从杀" | "从儿" | "从势";
  /** 取格依据(引用具体干支) */
  basis: string;
  /** 月令逢冲提示 */
  monthClashed: boolean;
};

const GOD_TO_NAME: Record<string, string> = {
  正官: "正官格", 七杀: "七杀格", 正财: "正财格", 偏财: "偏财格",
  正印: "正印格", 偏印: "偏印格", 食神: "食神格", 伤官: "伤官格",
};

/** 异党十神权重(用于从格命名) */
function categoryWeights(chart: BaziChart): Record<TenGodCategory, number> {
  const weights = tenGodWeightsOf(chart);
  return Object.fromEntries(weights.map((item) => [item.category, item.value])) as Record<TenGodCategory, number>;
}

export function judgePattern(chart: BaziChart, strength: StrengthResult): PatternResult {
  const dayMaster = chart.dayMaster;
  const monthPillar = chart.pillars[1];
  const monthBranch = monthPillar.ganzhi[1];
  const monthDiShi = monthPillar.diShi;

  // 月令逢冲:年/日/时支冲月支
  const otherBranches = chart.pillars.filter((p) => p.label !== "月柱").map((p) => p.ganzhi[1]);
  const monthClashed = otherBranches.some((branch) => CHONG_CHECK(branch, monthBranch));
  const clashNote = monthClashed ? "月令逢冲,格局根基受动,成色打折" : "";

  // ── 从格命名 ──
  if (strength.level === "从强") {
    return { name: "从旺格", tier: "从格取势", special: "从旺", basis: `日主一气专旺(同党${strength.score.support} vs 异党${strength.score.drain}),弃平衡从旺。${clashNote}`, monthClashed };
  }
  if (strength.level === "从弱") {
    const weights = categoryWeights(chart);
    const drains = ([
      ["财星", weights.财星], ["官杀", weights.官杀], ["食伤", weights.食伤],
    ] as Array<[TenGodCategory, number]>).sort((a, b) => b[1] - a[1]);
    const mixed = drains[1][1] >= drains[0][1] * 0.8;
    const special = mixed ? "从势" : drains[0][0] === "财星" ? "从财" : drains[0][0] === "官杀" ? "从杀" : "从儿";
    const name = special === "从势" ? "从势格" : special === "从财" ? "从财格" : special === "从杀" ? "从杀格" : "从儿格";
    const dominant = drains.slice(0, 2).map(([category, value]) => `${category}${value.toFixed(1)}`).join("、");
    return { name, tier: "从格取势", special, basis: `日主无根无助(同党${strength.score.support}),弃命从势;主导之势为${dominant}。${clashNote}`, monthClashed };
  }

  // ── 建禄格/阳刃格:月令为日主临官/帝旺 ──
  const luBranch = LU_OF[dayMaster];
  const renBranch = REN_OF[dayMaster];
  if (monthBranch === renBranch && isYangGan(dayMaster)) {
    return { name: "阳刃格", tier: "藏而不透", special: null, basis: `月令${monthBranch}为日主${dayMaster}帝旺之刃地,阳刃秉令。${clashNote}`, monthClashed };
  }
  if (monthBranch === luBranch) {
    return { name: "建禄格", tier: "藏而不透", special: null, basis: `月令${monthBranch}为日主${dayMaster}临官禄地,建禄秉令。${clashNote}`, monthClashed };
  }

  // ── 月令藏干透干取格(本>中>余;天干 = 年/月/时干,三柱盘只查年/月干) ──
  const stemsAsideDay = chart.pillars.filter((p) => p.label !== "日柱").map((p) => p.ganzhi[0]);
  const hidden = ZHI_HIDDEN[monthBranch] ?? [];
  for (const item of hidden) {
    if (stemsAsideDay.includes(item.stem)) {
      const god = tenGodOf(dayMaster, item.stem);
      const name = GOD_TO_NAME[god] ?? `${god}格`;
      const tier = item.grade === "本气" ? "本气透出" : item.grade === "中气" ? "中气透出" : "余气透出";
      return {
        name, tier, special: null,
        basis: `月令${monthBranch}藏干${item.stem}（${item.grade},对日主为${god}）透出天干,取${name}。${clashNote}`,
        monthClashed,
      };
    }
  }
  // 藏而不透:以月令本气论格
  const mainHidden = hidden[0];
  if (mainHidden) {
    const god = tenGodOf(dayMaster, mainHidden.stem);
    const name = GOD_TO_NAME[god] ?? `${god}格`;
    return {
      name, tier: "藏而不透", special: null,
      basis: `月令${monthBranch}藏干（${hidden.map((h) => h.stem).join("、")}）均未透干,以本气${mainHidden.stem}（${god}）论格,成色偏弱。${clashNote}`,
      monthClashed,
    };
  }
  // 理论不可达(月支必有藏干),防御性兜底:明确"无明显格局",不硬套
  return { name: "无明显格局", tier: "藏而不透", special: null, basis: `月令${monthBranch}藏干异常,无法按通行口径取格,如实标注不明显格局。${clashNote}`, monthClashed };
}

// 六冲内查(避免与 relations.ts 循环依赖,内联小表)
const CHONG_TABLE: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
const CHONG_CHECK = (a: string, b: string) => CHONG_TABLE[a] === b;
