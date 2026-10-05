// 双方合盘时间层单测:交集计算、流年窗口、阶段裁剪、真实排盘结构。
// 运行:node_modules/.bin/esbuild tests/dual-timeline.test.mjs --bundle --platform=node --format=esm --outfile=/tmp/dual-timeline.test.mjs && node --test /tmp/dual-timeline.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  ANNUAL_WINDOW_YEARS,
  personAnnualRange,
  computeAvailableRange,
  sanitizeFutureRhythm,
  buildPersonTimeline,
} from "../app/myfate-dual-timeline.ts";
import { yearToGanZhi, tenGod } from "../app/myfate-dual-engine.ts";
import { buildBaziChart } from "../app/myfate-bazi-engine.ts";

test("personAnnualRange: 20 年窗口,当前年起算", () => {
  assert.deepEqual(personAnnualRange(2026), { startYear: 2026, endYear: 2045 });
  assert.equal(ANNUAL_WINDOW_YEARS, 20);
});

test("computeAvailableRange: 规格示例 A 2026-2045 ∩ B 2028-2040 = 2028-2040", () => {
  assert.deepEqual(
    computeAvailableRange({ startYear: 2026, endYear: 2045 }, { startYear: 2028, endYear: 2040 }),
    { startYear: 2028, endYear: 2040 },
  );
  assert.deepEqual(
    computeAvailableRange({ startYear: 2026, endYear: 2030 }, { startYear: 2026, endYear: 2028 }),
    { startYear: 2026, endYear: 2028 },
  );
  assert.equal(computeAvailableRange({ startYear: 2026, endYear: 2030 }, { startYear: 2031, endYear: 2040 }), null);
});

test("yearToGanZhi: 1984 甲子 / 2026 丙午", () => {
  assert.equal(yearToGanZhi(1984), "甲子");
  assert.equal(yearToGanZhi(2026), "丙午");
  assert.equal(yearToGanZhi(2045), "乙丑");
});

test("sanitizeFutureRhythm: 越界裁剪到范围内,无效阶段丢弃,排序限量", () => {
  const range = { startYear: 2028, endYear: 2040 };
  const out = sanitizeFutureRhythm({
    supportive_periods: [
      { start_year: 2026, end_year: 2030, label: "支持阶段一", detail: "双方互动趋势更平稳 supportive detail" },
      { start_year: 2038, end_year: 2042, label: "支持阶段二", detail: "靠近范围尾部裁剪 supportive detail" },
      { start_year: 2041, end_year: 2044, label: "完全越界应丢弃", detail: "outside range should drop detail" },
    ],
    pressure_periods: [
      { start_year: 2035, end_year: 2036, label: "压力阶段一", detail: "关系压力可能上升 pressure detail" },
    ],
  }, range);
  assert.deepEqual(out.supportive_periods.map((p) => [p.start_year, p.end_year]), [[2028, 2030], [2038, 2040]]);
  assert.equal(out.pressure_periods.length, 1);
  assert.equal(out.pressure_periods[0].start_year, 2035);
});

test("sanitizeFutureRhythm: 无范围时两组清空", () => {
  const out = sanitizeFutureRhythm({
    supportive_periods: [{ start_year: 2026, end_year: 2028, label: "任意阶段", detail: "should be cleared detail" }],
    pressure_periods: [{ start_year: 2030, end_year: 2031, label: "任意阶段", detail: "should be cleared detail" }],
  }, null);
  assert.deepEqual(out, { supportive_periods: [], pressure_periods: [] });
});

test("sanitizeFutureRhythm: 最多保留 3 个并按起始年排序", () => {
  const periods = [2032, 2029, 2035].map((year) => ({ start_year: year, end_year: year + 1, label: `阶段${year}`, detail: "trend detail long enough" }));
  const out = sanitizeFutureRhythm({ supportive_periods: periods, pressure_periods: [] }, { startYear: 2026, endYear: 2045 });
  assert.deepEqual(out.supportive_periods.map((p) => p.start_year), [2029, 2032, 2035]);
});

const SEOUL = { id: "test", name: "首尔", lat: 37.57, lon: 126.98, tz: "Asia/Seoul" };

function chartOfFemale() {
  return buildBaziChart({ birthDate: "2002-07-19", birthTime: "04:10", gender: "female", city: SEOUL });
}

test("buildPersonTimeline: 窗口内逐年流年齐备,十神与关系结构完整", () => {
  const chart = chartOfFemale();
  const range = { startYear: 2026, endYear: 2045 };
  const timeline = buildPersonTimeline(chart, range);
  assert.equal(timeline.annualLuck.length, 20);
  assert.equal(timeline.annualLuck[0].year, 2026);
  assert.equal(timeline.annualLuck.at(-1).year, 2045);
  assert.equal(timeline.annualLuck[0].pillar, yearToGanZhi(2026));
  for (const year of timeline.annualLuck) {
    assert.ok(year.tenGodStem.length >= 2, `流年 ${year.year} 天干十神缺失`);
    assert.ok(year.tenGodBranch.length >= 2, `流年 ${year.year} 地支十神缺失`);
    assert.ok(Array.isArray(year.relationshipsWithNatalChart));
    assert.ok(Array.isArray(year.relationshipsWithMajorLuck));
    // 2036 丙辰:辰与日支子无关系时允许为空,但多数流年应有结构信号
  }
  // 至少一半流年与大运有可标注关系或归属大运信息
  const withDayun = timeline.annualLuck.filter((y) => y.extraData.majorLuckGanZhi);
  assert.ok(withDayun.length >= 18, `流年归属大运不完整: ${withDayun.length}/20`);
  // 大运步骤与窗口相交且包含当前步
  assert.ok(timeline.majorLuck.length >= 1 && timeline.majorLuck.length <= 3);
  assert.equal(timeline.majorLuck.filter((s) => s.extraData.current).length, 1);
  for (const step of timeline.majorLuck) {
    assert.ok(step.endYear >= range.startYear && step.startYear <= range.endYear);
    assert.ok(step.tenGodStem.length >= 2 && step.tenGodBranch.length >= 2);
  }
  // 原局基础:四柱干支、五行、十神
  assert.equal(timeline.stems.length, 4);
  assert.equal(timeline.branches.length, 4);
  assert.equal(timeline.tenGods.length, 4);
  assert.equal(timeline.tenGods[2].ganzhi, "戊子");
  assert.ok(timeline.fiveElements.木 >= 0 && timeline.fiveElements.水 >= 0);
});

test("tenGod: 日主戊 见 壬 为偏财(阳性同见)", () => {
  assert.equal(tenGod("戊", "壬"), "偏财");
});
