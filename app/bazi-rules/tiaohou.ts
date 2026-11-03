// ── 调候分析(个人报告 V3,确定性,寒暖燥湿口径) ─────────────────────────
// 简化的调候思想(源自《穷通宝鉴》的冬生喜火、夏生喜水原则,做规则化实现):
// 寒热 = 火水力量差 + 月令季节修正;燥湿 = 燥土(戌未)与湿土(辰丑)及水的差。
// 调候用神与扶抑用神分列:一致则同向发力,冲突则提示权衡——不由 AI 自选。
// 调候只描述气候性失衡,不等同吉凶;春秋月出生多数为"无急需"。

import type { BaziChart } from "../myfate-bazi-engine";
import { SEASON_OF_MONTH, type Element } from "./constants";
import type { FuYongResult } from "./strength";

export type TiaoHouState =
  | "过寒" | "偏寒" | "寒暖适中" | "偏暖" | "过热"
  | "偏燥" | "偏湿" | "燥湿平和";

export type TiaoHouResult = {
  state: TiaoHouState;
  /** 调候用神(寒用火/热用水/燥用水/湿用火;适中为 null) */
  yongShen: Element | null;
  /** 调候是否已在局中备足(用神五行 ≥2 个) */
  prepared: boolean;
  /** 与扶抑用神的关系 */
  relation: "一致(扶抑调候同向)" | "互补(调候补扶抑未及)" | "冲突(扶抑忌神恰为调候所需,取用需权衡)" | "无急需";
  /** 数值与依据 */
  basis: string;
};

export function judgeTiaoHou(chart: BaziChart, fuYong: FuYongResult): TiaoHouResult {
  const monthBranch = chart.pillars[1].ganzhi[1];
  const season = SEASON_OF_MONTH[monthBranch];
  const counts = chart.wuXing;

  // ── 寒热指数:火(暖) vs 水(寒) + 月令修正 ──
  let warm = counts.火;
  let cold = counts.水;
  if (season === "冬") cold += 1.5;
  if (season === "夏") warm += 1.5;
  if (season === "四季土") { /* 丑辰偏寒湿、未戌偏燥热,放到燥湿维度处理 */ }
  const thermal = warm - cold;

  // ── 燥湿指数:燥土(未戌)与火 vs 湿土(丑辰)与水 ──
  const dryBranches = chart.pillars.filter((p) => p.ganzhi[1] === "未" || p.ganzhi[1] === "戌").length;
  const wetBranches = chart.pillars.filter((p) => p.ganzhi[1] === "丑" || p.ganzhi[1] === "辰").length;
  const moisture = wetBranches * 0.8 + counts.水 * 0.4 - dryBranches * 0.8 - counts.火 * 0.2;

  let state: TiaoHouState;
  let yongShen: Element | null = null;
  if (thermal <= -2) { state = "过寒"; yongShen = "火"; }
  else if (thermal <= -0.8) { state = "偏寒"; yongShen = "火"; }
  else if (thermal >= 2) { state = "过热"; yongShen = "水"; }
  else if (thermal >= 0.8) { state = "偏暖"; yongShen = "水"; }
  else if (moisture >= 1.2) { state = "偏湿"; yongShen = "火"; }
  else if (moisture <= -1.2) { state = "偏燥"; yongShen = "水"; }
  else state = "寒暖适中";

  // 无明显寒热失衡时,春秋与四季月出生不急调候
  if (state === "寒暖适中" && (season === "春" || season === "秋")) {
    state = "燥湿平和";
  }
  if (state === "寒暖适中" || state === "燥湿平和") yongShen = null;

  const prepared = yongShen ? counts[yongShen] >= 2 : true;
  let relation: TiaoHouResult["relation"] = "无急需";
  if (yongShen) {
    if (fuYong.favorable.includes(yongShen)) relation = "一致(扶抑调候同向)";
    else if (fuYong.cautious.includes(yongShen)) relation = "冲突(扶抑忌神恰为调候所需,取用需权衡)";
    else relation = "互补(调候补扶抑未及)";
  }

  const basis = [
    `生于${monthBranch}月（${season === "四季土" ? "土旺用事" : season + "月"}）`,
    `火${warm.toFixed(1)} vs 水${cold.toFixed(1)}（含月令修正）,寒热指数${thermal.toFixed(1)}`,
    `湿源${(wetBranches * 0.8 + counts.水 * 0.4).toFixed(1)} vs 燥源${(dryBranches * 0.8 + counts.火 * 0.2).toFixed(1)},燥湿指数${moisture.toFixed(1)}`,
    `→ ${state}${yongShen ? `,调候用神取${yongShen}` : ",无急调候之需"}${prepared ? "（局中已备）" : ""}`,
    relation !== "无急需" ? `与扶抑取用${relation}` : "",
  ].filter(Boolean).join(";");

  return { state, yongShen, prepared, relation, basis };
}
