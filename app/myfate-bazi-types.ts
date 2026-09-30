// 排盘数据结构(历史报告渲染所需;排盘引擎本身已下线)。

export type BaziPillar = {
  label: string;
  ganzhi: string;
  shiShenGan: string;
  hideGan: string[];
  hideShiShen: string[];
  naYin: string;
};

export type BaziDaYunStep = {
  ganzhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  current: boolean;
};

export type BaziTrueSolar = {
  city: string;
  birthTime: string;
  adjustedTime: string;
  longitudeCorrectionMin: number;
  equationOfTimeMin: number;
  totalCorrectionMin: number;
  changedDay: boolean;
};

export type BaziChart = {
  pillars: BaziPillar[];
  dayMaster: string;
  wuXing: Record<string, number>;
  trueSolar: BaziTrueSolar;
  daYun: {
    startText: string;
    steps: BaziDaYunStep[];
  };
  currentDaYunGanZhi: string;
  currentYearGanZhi: string;
};

// ── 个人八字解读 (version 5) ────────────────────────────────────────────────

export type BaziSection = {
  id: string;
  title: string;
  body: string;
};

export type BaziReadingResult = {
  version: 5;
  name: string;
  headline: string;
  summary: string;
  chart: BaziChart;
  gender: "male" | "female";
  sections: BaziSection[];
  interpretationSource: "none" | "deepseek" | "template";
};

export const BAZI_RESULT_PREFIX = "MYFATE_BAZI_V1\n";

export function serializeBaziResult(result: BaziReadingResult) {
  return `${BAZI_RESULT_PREFIX}${JSON.stringify(result)}`;
}

export function parseBaziResult(value: string | null | undefined): BaziReadingResult | null {
  if (!value?.startsWith(BAZI_RESULT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(BAZI_RESULT_PREFIX.length)) as BaziReadingResult;
    if (parsed?.version !== 5 || !parsed.chart?.pillars?.length || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}
