// ── 神煞(个人报告 V3 统一口径) ─────────────────────────────────────────
// 驿马/桃花以年支、日支双基准起三合局查其余各支(子平通行口径);阳刃按阳干日主
// 查帝旺支(阴干无刃)。有则给落点柱位与查询依据,无则明确"未见",AI 不得另算。
// 该口径与 myfate-static-reading.buildShenShaFacts 保持一致(规则层为结构化版本)。

import type { BaziChart } from "../myfate-bazi-engine";

const YI_MA_OF: Record<string, string> = {
  申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
  巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
};
const TAO_HUA_OF: Record<string, string> = {
  申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯",
  巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子",
};
const YANG_REN_OF: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

export type ShenShaHit = { pillar: string; branch: string; refs: string[] };
export type ShenShaItem = {
  name: "驿马" | "阳刃" | "桃花";
  present: boolean;
  hits: ShenShaHit[];
  /** 有/无的命理语义(中性,供文案引用) */
  meaning: string;
};

export function buildShenSha(chart: BaziChart): ShenShaItem[] {
  const pillars = chart.pillars.map((pillar) => ({ label: pillar.label, branch: pillar.ganzhi[1] ?? "" }));
  const scanByRefs = (targetOf: (branch: string) => string | undefined): ShenShaHit[] => {
    const byPillar = new Map<string, string[]>();
    for (const ref of [pillars[0], pillars[2]]) {
      const target = targetOf(ref.branch);
      if (!target) continue;
      for (const pillar of pillars) {
        if (pillar === ref || pillar.branch !== target) continue;
        const key = `${pillar.label}${pillar.branch}`;
        byPillar.set(key, [...(byPillar.get(key) ?? []), `以${ref.label}${ref.branch}查得${target}`]);
      }
    }
    // key 形如"年柱寅":柱位 = 去掉末位支字
    return [...byPillar.entries()].map(([key, refs]) => ({
      pillar: key.slice(0, -1),
      branch: key.slice(-1),
      refs,
    }));
  };

  const yiMa = scanByRefs((branch) => YI_MA_OF[branch]);
  const taoHua = scanByRefs((branch) => TAO_HUA_OF[branch]);
  const renBranch = YANG_REN_OF[chart.dayMaster];
  const yangRen: ShenShaHit[] = renBranch
    ? pillars.filter((p) => p.branch === renBranch).map((p) => ({ pillar: p.label, branch: p.branch, refs: [`日主${chart.dayMaster}为阳干,刃在${renBranch}`] }))
    : [];

  const describe = (name: "驿马" | "阳刃" | "桃花", hits: ShenShaHit[], presentMeaning: string, absentMeaning: string): ShenShaItem => ({
    name,
    present: hits.length > 0,
    hits,
    meaning: hits.length
      ? `${presentMeaning}:命中 ${hits.map((h) => `${h.pillar}${h.branch}（${h.refs.join("、")}）`).join("、")}`
      : absentMeaning,
  });

  const pillarWord = `${pillars.length}柱`;
  return [
    describe("驿马", yiMa, "原局见驿马,传统象征流动、出行与环境变化", `以年支、日支查${pillarWord},原局未见驿马——轨迹相对安稳,适合固定基本盘深耕`),
    describe("阳刃", yangRen, "原局见阳刃,传统象征刚强、果断与行动锋芒", renBranch
      ? `阳刃支${renBranch}未在${pillarWord}出现,原局未见阳刃——少极端暴烈冲动,财务婚姻不易剧烈震荡`
      : `日主${chart.dayMaster}为阴干,通行口径无阳刃,原局未见阳刃——少极端暴烈冲动,财务婚姻不易剧烈震荡`),
    describe("桃花", taoHua, "原局见桃花,传统象征社交魅力与情感吸引力", `以年支、日支查${pillarWord},原局未见桃花——魅力不走外显社交路线,关系更多在日常相处中沉淀`),
  ];
}
