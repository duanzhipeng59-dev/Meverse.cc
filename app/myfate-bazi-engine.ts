// 八字排盘引擎:真太阳时校准(经度差+均时差)+ lunar-javascript EightChar。
// 基准验证:2002-07-19 04:10 → 壬午 丁未 戊子 甲寅(含立春/晚子时边界用例)。

import { Solar } from "lunar-javascript";
import type { VedicCity } from "./myfate-cities";

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

const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const ZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

function equationOfTimeMinutes(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000) + 1;
  const g = (2 * Math.PI * (dayOfYear - 1)) / 365;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function buildBaziChart(input: {
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM (北京时间)
  gender: "male" | "female";
  city: VedicCity;
}): BaziChart {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);

  // 真太阳时 = 北京时间 + 经度差修正(每度4分钟) + 均时差
  const longitudeCorrectionMin = (input.city.lon - 120) * 4;
  const equationMin = equationOfTimeMinutes(new Date(Date.UTC(year, month - 1, day)));
  const totalCorrectionMin = longitudeCorrectionMin + equationMin;
  const birth = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const adjusted = new Date(birth.getTime() + Math.round(totalCorrectionMin * 60_000));
  const trueSolar: BaziTrueSolar = {
    city: input.city.name,
    birthTime: `${input.birthDate} ${pad(hour)}:${pad(minute)}`,
    adjustedTime: `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth() + 1)}-${pad(adjusted.getUTCDate())} ${pad(adjusted.getUTCHours())}:${pad(adjusted.getUTCMinutes())}`,
    longitudeCorrectionMin: Math.round(longitudeCorrectionMin * 10) / 10,
    equationOfTimeMin: Math.round(equationMin * 10) / 10,
    totalCorrectionMin: Math.round(totalCorrectionMin * 10) / 10,
    changedDay: adjusted.getUTCDate() !== day,
  };

  const ec = Solar.fromYmdHms(
    adjusted.getUTCFullYear(), adjusted.getUTCMonth() + 1, adjusted.getUTCDate(),
    adjusted.getUTCHours(), adjusted.getUTCMinutes(), 0,
  ).getLunar().getEightChar();
  ec.setSect(2); // 晚子时:23点后日柱不变、时柱为子

  const pillar = (label: string, ganzhi: string, shiShenGan: string, hideGan: string[], hideShiShen: string[], naYin: string): BaziPillar =>
    ({ label, ganzhi, shiShenGan: label === "日柱" ? `日主${shiShenGan}` : shiShenGan, hideGan, hideShiShen, naYin });

  const pillars: BaziPillar[] = [
    pillar("年柱", ec.getYear(), ec.getYearShiShenGan(), ec.getYearHideGan(), ec.getYearShiShenZhi(), ec.getYearNaYin()),
    pillar("月柱", ec.getMonth(), ec.getMonthShiShenGan(), ec.getMonthHideGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin()),
    pillar("日柱", ec.getDay(), ec.getDayGan(), ec.getDayHideGan(), ec.getDayShiShenZhi(), ec.getDayNaYin()),
    pillar("时柱", ec.getTime(), ec.getTimeShiShenGan(), ec.getTimeHideGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin()),
  ];

  const wuXing: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    wuXing[GAN_WUXING[p.ganzhi[0]]] += 1;
    wuXing[ZHI_WUXING[p.ganzhi[1]]] += 1;
  }

  const yun = ec.getYun(input.gender === "male" ? 1 : 0);
  const currentYear = new Date().getFullYear();
  const steps: BaziDaYunStep[] = [];
  for (const dy of yun.getDaYun(9)) {
    const ganzhi = dy.getGanZhi();
    if (!ganzhi) continue; // 起运前的第一步没有干支
    const startYear = dy.getStartYear();
    const endYear = dy.getEndYear();
    steps.push({
      ganzhi,
      startYear,
      endYear,
      startAge: dy.getStartAge(),
      endAge: dy.getEndAge(),
      current: currentYear >= startYear && currentYear <= endYear,
    });
  }

  let currentYearGanZhi = "";
  for (const step of steps) {
    if (step.current) {
      for (const ln of (yun.getDaYun(9).find((dy) => dy.getGanZhi() === step.ganzhi)?.getLiuNian() ?? [])) {
        if (ln.getYear() === currentYear) currentYearGanZhi = ln.getGanZhi();
      }
      break;
    }
  }
  if (!currentYearGanZhi) {
    currentYearGanZhi = Solar.fromYmdHms(currentYear, 6, 1, 12, 0, 0).getLunar().getYearInGanZhi();
  }

  return {
    pillars,
    dayMaster: ec.getDayGan(),
    wuXing,
    trueSolar,
    daYun: {
      startText: `${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天`,
      steps,
    },
    currentDaYunGanZhi: steps.find((step) => step.current)?.ganzhi ?? "",
    currentYearGanZhi,
  };
}
