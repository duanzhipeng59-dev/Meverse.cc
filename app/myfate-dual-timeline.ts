// 双方合盘时间层:排盘系统负责的确定性计算——每人可用流年范围、范围内大运/流年结构、
// 双方可分析时间交集(available_time_range)。Gemini 只解释这些数据,不得补算任何年份。
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import { tenGod, GAN_HE, LIU_HE, CHONG, HAI, PO, POS_MEANING, yearToGanZhi } from "./myfate-dual-engine";

export type YearRange = { startYear: number; endYear: number };

// 每人可用流年范围:当前年份起 20 年窗口(如 2026-2045)
export const ANNUAL_WINDOW_YEARS = 20;

export function personAnnualRange(currentYear: number): YearRange {
  return { startYear: currentYear, endYear: currentYear + ANNUAL_WINDOW_YEARS - 1 };
}

// 双方可分析时间范围 = A 流年范围 ∩ B 流年范围;无重合返回 null
export function computeAvailableRange(a: YearRange, b: YearRange): YearRange | null {
  const startYear = Math.max(a.startYear, b.startYear);
  const endYear = Math.min(a.endYear, b.endYear);
  return startYear <= endYear ? { startYear, endYear } : null;
}

export const rhythmPeriodSchema = z.object({
  start_year: z.number().int().min(1900).max(2200),
  end_year: z.number().int().min(1900).max(2200),
  label: z.string().min(4).max(16),
  detail: z.string().min(15).max(140),
});

export const futureRhythmSchema = z.object({
  supportive_periods: z.array(rhythmPeriodSchema).max(3),
  pressure_periods: z.array(rhythmPeriodSchema).max(3),
});

// 后端校验:所有阶段裁剪到 available_time_range 内,丢弃无效阶段,排序并限量;无范围时清空
export function sanitizeFutureRhythm(rhythm: z.infer<typeof futureRhythmSchema>, range: YearRange | null): z.infer<typeof futureRhythmSchema> {
  if (!range) return { supportive_periods: [], pressure_periods: [] };
  const clamp = (periods: Array<z.infer<typeof rhythmPeriodSchema>>) =>
    periods
      // 完全落在范围外的阶段直接丢弃,不产生裁剪残留
      .filter((period) => period.end_year >= range.startYear && period.start_year <= range.endYear)
      .map((period) => ({
        ...period,
        start_year: Math.max(range.startYear, Math.min(period.start_year, range.endYear)),
        end_year: Math.max(range.startYear, Math.min(period.end_year, range.endYear)),
      }))
      .filter((period) => period.start_year <= period.end_year)
      .sort((a, b) => a.start_year - b.start_year)
      .slice(0, 3);
  return {
    supportive_periods: clamp(rhythm.supportive_periods),
    pressure_periods: clamp(rhythm.pressure_periods),
  };
}

export type MajorLuckStep = {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  pillar: string;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGodStem: string;
  tenGodBranch: string;
  relationshipsWithNatalChart: string[];
  extraData: Record<string, unknown>;
};

export type AnnualLuckYear = {
  year: number;
  pillar: string;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGodStem: string;
  tenGodBranch: string;
  relationshipsWithNatalChart: string[];
  relationshipsWithMajorLuck: string[];
  extraData: Record<string, unknown>;
};

export type PersonTimeline = {
  fiveElements: Record<string, number>;
  tenGods: Array<{ position: string; ganzhi: string; stemTenGod: string; hiddenTenGods: string[] }>;
  stems: string[];
  branches: string[];
  majorLuck: MajorLuckStep[];
  annualLuck: AnnualLuckYear[];
};

const ZHI_MAIN_QI: Record<string, string> = { 子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙", 午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬" };
// 无恩/恃势刑的成对组合(自刑另算)
const XING_PAIRS: Array<[string, string]> = [["寅", "巳"], ["巳", "申"], ["寅", "申"], ["丑", "戌"], ["戌", "未"], ["丑", "未"]];
const BRANCH_RELATIONS: Array<[string, Record<string, string>]> = [["六合", LIU_HE], ["相冲", CHONG], ["相害", HAI], ["相破", PO]];

// 一柱干支对另一柱干支的结构关系(天干五合 + 地支合冲害破刑)
function pillarRelations(stem: string, branch: string, otherStem: string, otherBranch: string, label?: string): string[] {
  const out: string[] = [];
  const suffix = label ? `(${label})` : "";
  if (GAN_HE[stem] === otherStem) out.push(`${stem}与${otherStem}天干五合${suffix}`);
  for (const [type, table] of BRANCH_RELATIONS) {
    if (table[branch] === otherBranch) out.push(`${branch}与${otherBranch}${type}${suffix}`);
  }
  if (XING_PAIRS.some(([x, y]) => (branch === x && otherBranch === y) || (branch === y && otherBranch === x))) out.push(`${branch}与${otherBranch}相刑${suffix}`);
  if ("辰午酉亥".includes(branch) && branch === otherBranch) out.push(`${branch}与${otherBranch}自刑${suffix}`);
  return out;
}

// 外来干支(大运/流年)与原局四柱的关系,标注柱位含义
function relationsWithNatal(stem: string, branch: string, chart: BaziChart): string[] {
  return chart.pillars.flatMap((pillar, index) =>
    pillarRelations(stem, branch, pillar.ganzhi[0], pillar.ganzhi[1], POS_MEANING[index]),
  );
}

// 一人的时间层:窗口内大运步骤 + 逐年流年(含十神与两层关系)
export function buildPersonTimeline(chart: BaziChart, range: YearRange): PersonTimeline {
  const dayMaster = chart.dayMaster;
  const stepOf = (year: number) => chart.daYun.steps.find((step) => year >= step.startYear && year <= step.endYear);

  const majorLuck: MajorLuckStep[] = chart.daYun.steps
    .filter((step) => step.endYear >= range.startYear && step.startYear <= range.endYear)
    .map((step) => {
      const heavenlyStem = step.ganzhi[0];
      const earthlyBranch = step.ganzhi[1];
      return {
        startAge: step.startAge,
        endAge: step.endAge,
        startYear: step.startYear,
        endYear: step.endYear,
        pillar: step.ganzhi,
        heavenlyStem,
        earthlyBranch,
        tenGodStem: tenGod(dayMaster, heavenlyStem),
        tenGodBranch: tenGod(dayMaster, ZHI_MAIN_QI[earthlyBranch]),
        relationshipsWithNatalChart: relationsWithNatal(heavenlyStem, earthlyBranch, chart),
        extraData: { current: step.current },
      };
    });

  const annualLuck: AnnualLuckYear[] = [];
  for (let year = range.startYear; year <= range.endYear; year += 1) {
    const ganzhi = yearToGanZhi(year);
    const heavenlyStem = ganzhi[0];
    const earthlyBranch = ganzhi[1];
    const dayun = stepOf(year);
    annualLuck.push({
      year,
      pillar: ganzhi,
      heavenlyStem,
      earthlyBranch,
      tenGodStem: tenGod(dayMaster, heavenlyStem),
      tenGodBranch: tenGod(dayMaster, ZHI_MAIN_QI[earthlyBranch]),
      relationshipsWithNatalChart: relationsWithNatal(heavenlyStem, earthlyBranch, chart),
      relationshipsWithMajorLuck: dayun
        ? pillarRelations(heavenlyStem, earthlyBranch, dayun.ganzhi[0], dayun.ganzhi[1], `所在${dayun.ganzhi}大运`)
        : [],
      extraData: dayun ? { majorLuckGanZhi: dayun.ganzhi, age: dayun.startAge + (year - dayun.startYear) } : {},
    });
  }

  return {
    fiveElements: chart.wuXing,
    tenGods: chart.pillars.map((pillar) => ({
      position: pillar.label,
      ganzhi: pillar.ganzhi,
      stemTenGod: pillar.shiShenGan,
      hiddenTenGods: pillar.hideShiShen,
    })),
    stems: chart.pillars.map((pillar) => pillar.ganzhi[0]),
    branches: chart.pillars.map((pillar) => pillar.ganzhi[1]),
    majorLuck,
    annualLuck,
  };
}
