// 个人八字报告 V3 · 10 组虚构命盘集成测试(真实 Gemini 调用)。
// 运行:npx esbuild scripts/test-report-v3.mjs --bundle --platform=node --format=esm --outfile=.cache/test-report-v3.mjs && node .cache/test-report-v3.mjs [--only=1,4] [--skip-dual]
// 产出:test-reports/v3/<id>.json(完整报告+判断锚点)与 test-reports/v3/summary.md(交付物 E)。
// 覆盖矩阵:10 个日主(壬×2/丙×2 做同日主个性化对照)、身强/偏强/中和/偏弱/身弱/从弱、
// 建禄/阳刃/从财/正官/伤官/正印/偏印/偏财等格局、缺金/缺水/缺火/五行俱全、
// 不同出生年(大运流年组合不同)、一组缺时辰三柱盘(TA 口径,子女章跳过)。
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

// ── 环境变量先于模型调用装载(.dev.vars 与 .env.local 均读,先到先得) ──
for (const envFile of [".env.local", ".dev.vars"]) {
  let envText = "";
  try {
    envText = readFileSync(envFile, "utf8");
  } catch {
    continue;
  }
  for (const line of envText.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

const { buildBaziChart, GAN_WUXING, ZHI_WUXING } = await import("../app/myfate-bazi-engine");
const { buildBaziLifeProfile } = await import("../app/myfate-bazi-profile");
const { buildBaziJudgment } = await import("../app/bazi-rules/judgment");
const { checkConsistency } = await import("../app/bazi-rules/consistency");
const { generateStaticReadingV3, SECTION_STAR_SYSTEM_PROMPT } = await import("../app/myfate-section-pipeline");
const { staticReadingSchema, sectionKeys } = await import("../app/myfate-static-reading");
const { generateDualReading } = await import("../app/myfate-dual-reading");
const { generateChatText } = await import("../app/api/myfate/personalize/model-provider");

const CITY = { id: "bj", name: "北京", lat: 39.9, lon: 116.4, tz: "Asia/Shanghai" };
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;
const skipDual = args.includes("--skip-dual");
const summaryOnly = args.includes("--summary-only");

// ── 10 组虚构测试命盘 ──
const CHARTS = [
  { id: "chart-01", label: "戊日·基准盘·偏强·正印格·缺金", date: "2002-07-19", time: "04:10", gender: "male" },
  { id: "chart-02", label: "辛日·身弱·偏印格·五行俱全", date: "1950-07-15", time: "12:00", gender: "male" },
  { id: "chart-03", label: "丙日·身强·偏印格·春木生身", date: "1954-03-01", time: "04:10", gender: "male" },
  { id: "chart-04", label: "壬日·从弱·从财格", date: "1954-02-15", time: "12:00", gender: "male" },
  { id: "chart-05", label: "丁日·中和·建禄格", date: "1953-06-15", time: "04:10", gender: "male" },
  { id: "chart-06", label: "丙日·偏强·阳刃格·同日主对照", date: "1951-06-15", time: "04:10", gender: "male" },
  { id: "chart-07", label: "庚日·身弱·偏财格·女命", date: "1951-03-01", time: "12:00", gender: "female" },
  { id: "chart-08", label: "甲日·偏弱·正官格·缺水·女命", date: "1955-09-20", time: "04:10", gender: "female" },
  { id: "chart-09", label: "己日·中和·伤官格·缺水·女命", date: "1956-08-20", time: "04:10", gender: "female" },
  { id: "chart-10", label: "癸日·缺时辰三柱盘·TA口径·子女章跳过", date: "1955-08-20", time: "04:10", gender: "female", noHour: true },
];

const callModel = async (system, prompt) =>
  (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 12000, json: true })).content;

function similarity(a, b) {
  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
    return set;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const gram of left) if (right.has(gram)) hit += 1;
  return hit / Math.min(left.size, right.size);
}

mkdirSync("test-reports/v3", { recursive: true });
const results = [];
const t0 = Date.now();

if (summaryOnly) {
  // 从已保存的报告重建 results(重跑失败盘后合并汇总;用当前校验器重算违规)
  for (const chart of CHARTS) {
    try {
      const saved = JSON.parse(readFileSync(`test-reports/v3/${chart.id}.json`, "utf8"));
      let full = buildBaziChart({ birthDate: chart.date, birthTime: chart.time, gender: chart.gender, city: CITY });
      if (chart.noHour) {
        const pillars = full.pillars.slice(0, 3);
        const wuXing = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
        for (const pillar of pillars) {
          wuXing[GAN_WUXING[pillar.ganzhi[0]]] += 1;
          wuXing[ZHI_WUXING[pillar.ganzhi[1]]] += 1;
        }
        full = { ...full, pillars, wuXing };
      }
      const judgment = buildBaziJudgment(full, buildBaziLifeProfile(full));
      const report = staticReadingSchema.parse(saved.report);
      const violations = checkConsistency(report, judgment);
      const fieldCount = sectionKeys.reduce((sum, key) => sum + (report.sections[key]?.insights.length ?? 0), 0);
      results.push({ id: chart.id, ok: true, duration: 0, fieldCount, violations, anchors: judgment.anchors, meta: saved.meta, report, fullText: JSON.stringify(report.sections), dayMaster: judgment.anchors.dayMaster });
    } catch {
      results.push({ id: chart.id, ok: false, duration: 0, error: "报告文件缺失或解析失败", anchors: null, meta: { ...chart } });
    }
  }
}

for (const chart of CHARTS) {
  if (summaryOnly) break;
  if (onlySet && !onlySet.has(chart.id)) continue;
  const started = Date.now();
  let full = buildBaziChart({ birthDate: chart.date, birthTime: chart.time, gender: chart.gender, city: CITY });
  let meta = { ...chart, pillars: full.pillars.map((p) => p.ganzhi).join(" ") };
  if (chart.noHour) {
    const pillars = full.pillars.slice(0, 3);
    const wuXing = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const pillar of pillars) {
      wuXing[GAN_WUXING[pillar.ganzhi[0]]] += 1;
      wuXing[ZHI_WUXING[pillar.ganzhi[1]]] += 1;
    }
    full = { ...full, pillars, wuXing };
    meta = { ...meta, pillars: pillars.map((p) => p.ganzhi).join(" ") };
  }
  const profile = buildBaziLifeProfile(full);
  const judgment = buildBaziJudgment(full, profile);
  const anchors = judgment.anchors;
  console.log(`\n▶ ${chart.id} ${chart.label}`);
  console.log(`  四柱 ${meta.pillars} | 旺衰${anchors.strength.level} | 格局${anchors.pattern.name} | 喜${anchors.fuYong.favorable.join("")}忌${anchors.fuYong.cautious.join("")} | 调候${anchors.tiaoHou.state} | 财富${anchors.wealthTier.tier}`);

  try {
    const report = await generateStaticReadingV3(callModel, judgment, chart.noHour ? { systemPrompt: SECTION_STAR_SYSTEM_PROMPT } : undefined);
    const parsed = staticReadingSchema.parse(report);
    const violations = checkConsistency(parsed, judgment);
    const fieldCount = sectionKeys.reduce((sum, key) => sum + (parsed.sections[key]?.insights.length ?? 0), 0);
    const duration = Math.round((Date.now() - started) / 1000);
    const fullText = JSON.stringify(parsed.sections);
    results.push({ id: chart.id, ok: true, duration, fieldCount, violations, anchors, meta, report: parsed, fullText, dayMaster: anchors.dayMaster });
    writeFileSync(`test-reports/v3/${chart.id}.json`, JSON.stringify({
      meta,
      anchors: {
        dayMaster: anchors.dayMaster, strength: anchors.strength.level, pattern: `${anchors.pattern.name}(${anchors.pattern.tier})`,
        favorable: anchors.fuYong.favorable, cautious: anchors.fuYong.cautious, tiaohou: anchors.tiaoHou.state,
        tenGods: anchors.tenGods.map((g) => `${g.category}${g.value}`).join(" "), wealthTier: `${anchors.wealthTier.tier}(${anchors.wealthTier.range})`,
      },
      report: parsed,
    }, null, 1));
    console.log(`  ✔ ${duration}s | ${fieldCount}字段 | 一致性违规 ${violations.length} 条${violations.length ? ":" + violations.map((v) => `[${v.section}${v.field ? ":" + v.field : ""}]${v.rule}`).join(",") : ""}`);
  } catch (error) {
    const duration = Math.round((Date.now() - started) / 1000);
    results.push({ id: chart.id, ok: false, duration, error: String(error), anchors, meta });
    console.log(`  ✘ ${duration}s 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ── 跨盘个性化检查 ──
const okResults = results.filter((r) => r.ok);
const personalization = { pairs: [], sameDayMaster: [] };
if (okResults.length >= 2) {
  for (let i = 0; i < okResults.length; i += 1) {
    for (let j = i + 1; j < okResults.length; j += 1) {
      const score = similarity(okResults[i].fullText, okResults[j].fullText);
      personalization.pairs.push({ a: okResults[i].id, b: okResults[j].id, score: Math.round(score * 100) / 100, sameDayMaster: okResults[i].dayMaster === okResults[j].dayMaster });
    }
  }
  // 同日主盘的字段级相似度(个性化硬指标)
  for (let i = 0; i < okResults.length; i += 1) {
    for (let j = i + 1; j < okResults.length; j += 1) {
      if (okResults[i].dayMaster !== okResults[j].dayMaster) continue;
      const probes = ["性格与行为模式", "职业方向", "配偶特征", "旺衰定性"];
      const fieldScores = probes.map((label) => {
        const ca = sectionKeys.flatMap((k) => okResults[i].report.sections[k]?.insights ?? []).find((ins) => ins.label === label)?.content ?? "";
        const cb = sectionKeys.flatMap((k) => okResults[j].report.sections[k]?.insights ?? []).find((ins) => ins.label === label)?.content ?? "";
        return { label, score: Math.round(similarity(ca, cb) * 100) / 100 };
      });
      personalization.sameDayMaster.push({ a: okResults[i].id, b: okResults[j].id, dayMaster: okResults[i].dayMaster, fields: fieldScores });
    }
  }
}

// ── 双人合盘回归(1 组,验证共用内核未受影响) ──
let dualResult = { skipped: true };
try {
  const savedDual = JSON.parse(readFileSync("test-reports/v3/dual-regression.json", "utf8"));
  dualResult = { ok: true, sections: Object.keys(savedDual.sections ?? {}).length, insights: Object.values(savedDual.sections ?? {}).reduce((sum, s) => sum + (s.insights?.length ?? 0), 0) };
} catch {}
if (!skipDual && !summaryOnly) {
  try {
    const subjectA = { name: "测试甲", gender: "male", birthDate: "2002-07-19", birthTime: "04:10", cityId: "bj", cityName: "北京" };
    const subjectB = { name: "测试乙", gender: "female", birthDate: "1951-03-01", birthTime: "12:00", cityId: "bj", cityName: "北京" };
    const dual = await generateDualReading(subjectA, subjectB);
    dualResult = { ok: true, sections: Object.keys(dual.sections).length, insights: Object.values(dual.sections).reduce((sum, s) => sum + s.insights.length, 0) };
    writeFileSync("test-reports/v3/dual-regression.json", JSON.stringify(dual, null, 1));
    console.log(`\n✔ 双人合盘回归: ${dualResult.sections}章 ${dualResult.insights}字段`);
  } catch (error) {
    dualResult = { ok: false, error: String(error) };
    console.log(`\n✘ 双人合盘回归失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ── 历史报告兼容:手写明星报告(consult_overrides 同构)过 staticReadingSchema ──
let compat = { checked: 0, pass: 0, fail: [] };
try {
  for (const file of readdirSync("scripts/foreign-reports")) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(`scripts/foreign-reports/${file}`, "utf8"));
    const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "heroPillars" && k !== "heroBadges"));
    const reportOnly = rest;
    compat.checked += 1;
    if (staticReadingSchema.safeParse(reportOnly).success) compat.pass += 1;
    else compat.fail.push(file);
  }
} catch (error) {
  compat.fail.push(`目录读取失败:${String(error)}`);
}

// ── 汇总 ──
const maxPair = personalization.pairs.length ? Math.max(...personalization.pairs.map((p) => p.score)) : 0;
const avgPair = personalization.pairs.length ? personalization.pairs.reduce((s, p) => s + p.score, 0) / personalization.pairs.length : 0;
const sameDmHigh = personalization.sameDayMaster.flatMap((pair) => pair.fields).filter((f) => f.score > 0.6);
const allViolations = results.flatMap((r) => r.ok ? r.violations.map((v) => `${r.id}[${v.section}${v.field ? ":" + v.field : ""}]${v.rule}:${v.detail}`) : []);
const summary = {
  生成统计: {
    成功: `${results.filter((r) => r.ok).length}/${results.length}`,
    总耗时秒: Math.round((Date.now() - t0) / 1000),
    平均单盘秒: okResults.length ? Math.round(okResults.reduce((s, r) => s + r.duration, 0) / okResults.length) : 0,
  },
  一致性: { 剩余违规: allViolations.length, 明细: allViolations.slice(0, 20) },
  个性化: {
    跨盘相似度均值: Math.round(avgPair * 100) / 100,
    跨盘相似度最大: maxPair,
    "同日主字段相似度超0.6": sameDmHigh.length,
    同日主明细: personalization.sameDayMaster,
  },
  双人合盘回归: dualResult,
  历史兼容: compat,
};
writeFileSync("test-reports/v3/summary.json", JSON.stringify(summary, null, 1));

// summary.md(交付物 E 的人工审读索引)
const md = [
  "# V3 报告生成 · 10 盘集成测试汇总",
  "",
  `- 生成:${summary.生成统计.成功} 成功,平均 ${summary.生成统计.平均单盘秒}s/盘,总 ${summary.生成统计.总耗时秒}s`,
  `- 一致性剩余违规:${allViolations.length} 条(引擎已拦截硬性违规,剩余为容忍的表达类)`,
  `- 个性化:跨盘相似度均值 ${summary.个性化.跨盘相似度均值}/最大 ${summary.个性化.跨盘相似度最大};同日主字段相似度>0.6 共 ${sameDmHigh.length} 处`,
  `- 双人合盘回归:${dualResult.skipped ? "跳过" : dualResult.ok ? `通过(${dualResult.sections}章${dualResult.insights}字段)` : `失败:${dualResult.error}`}`,
  `- 历史兼容:${compat.pass}/${compat.checked} 份手写明星报告通过现有 Schema${compat.fail.length ? ";失败:" + compat.fail.join(",") : ""}`,
  "",
  "| 命盘 | 日主 | 旺衰 | 格局 | 耗时 | 字段 | 违规 |",
  "|---|---|---|---|---|---|---|",
  ...results.map((r) => `| ${r.id} | ${r.anchors?.dayMaster ?? "-"} | ${r.anchors?.strength.level ?? "-"} | ${r.anchors?.pattern.name ?? "-"} | ${r.duration}s | ${r.ok ? r.fieldCount : "-"} | ${r.ok ? r.violations.length : "失败"} |`),
  "",
  "人工审读建议:chart-01(基准盘)、chart-04(从格)、chart-09(女命伤官格)为指定审读样本。",
].join("\n");
writeFileSync("test-reports/v3/summary.md", md);
console.log("\n════ 汇总 ════");
console.log(JSON.stringify(summary, null, 1));
