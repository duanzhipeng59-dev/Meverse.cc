// 双人合盘 V3 · 3 组虚构命盘对集成测试(真实 Gemini 调用)。
// 运行:npx esbuild scripts/test-dual-v3.mjs --bundle --platform=node --format=esm --outfile=.cache/test-dual-v3.mjs && NODE_USE_ENV_PROXY=1 node --cache/... [--only=1] 
// 覆盖:强弱互补对 / 双强对 / 中和组合对;检查 schema、双人一致性违规、口径一致、
// 跨对个性化相似度、旧管线产物回归(dual-regression.json 过 dualReadingSchema)。
import { readFileSync, writeFileSync } from "node:fs";

for (const envFile of [".env.local", ".dev.vars"]) {
  let envText = "";
  try { envText = readFileSync(envFile, "utf8"); } catch { continue; }
  for (const line of envText.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

const { buildBaziChart } = await import("../app/myfate-bazi-engine");
const { buildBaziJudgment } = await import("../app/bazi-rules/judgment");
const { buildDualJudgment } = await import("../app/bazi-rules/dual-judgment");
const { checkDualConsistency } = await import("../app/bazi-rules/dual-consistency");
const { generateDualReadingV3 } = await import("../app/myfate-dual-pipeline");
const { dualReadingSchema } = await import("../app/myfate-dual-reading");
const { generateChatText } = await import("../app/api/myfate/personalize/model-provider");

const CITY = { id: "bj", name: "北京", lat: 39.9, lon: 116.4, tz: "Asia/Shanghai" };
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

const PAIRS = [
  { id: "dual-01", label: "强弱互补对", a: { name: "李明", date: "2002-07-19", time: "04:10", gender: "male" }, b: { name: "王芳", date: "1951-03-01", time: "12:00", gender: "female" } },
  { id: "dual-02", label: "双强主导对", a: { name: "陈刚", date: "1954-03-01", time: "04:10", gender: "male" }, b: { name: "赵蕾", date: "1951-06-15", time: "04:10", gender: "female" } },
  { id: "dual-03", label: "中和组合对", a: { name: "周平", date: "1953-06-15", time: "04:10", gender: "male" }, b: { name: "吴静", date: "1956-08-20", time: "04:10", gender: "female" } },
];

const callModel = async (system, prompt) =>
  (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 12000, json: true })).content;

function similarity(a, b) {
  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
    return set;
  };
  const left = bigrams(a); const right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const gram of left) if (right.has(gram)) hit += 1;
  return hit / Math.min(left.size, right.size);
}

const results = [];
const t0 = Date.now();

for (const pair of PAIRS) {
  if (onlySet && !onlySet.has(pair.id)) continue;
  const started = Date.now();
  const chartA = buildBaziChart({ birthDate: pair.a.date, birthTime: pair.a.time, gender: pair.a.gender, city: CITY });
  const chartB = buildBaziChart({ birthDate: pair.b.date, birthTime: pair.b.time, gender: pair.b.gender, city: CITY });
  const dual = buildDualJudgment(chartA, chartB, pair.a.name, pair.b.name);
  console.log(`\n▶ ${pair.id} ${pair.label}`);
  console.log(`  ${dual.relation.strengthComboText}`);
  console.log(`  ${dual.relation.dayMasterText}`);
  console.log(`  跨盘互动 ${dual.relation.crossRelations.length} 条 | 互补定性:${/定性:([^。]*)/.exec(dual.relation.wuxingComplementText)?.[1] ?? "-"}`);
  try {
    const report = await generateDualReadingV3(callModel, dual);
    const parsed = dualReadingSchema.parse(report);
    const violations = checkDualConsistency(parsed, dual);
    const fieldCount = Object.values(parsed.sections).reduce((sum, s) => sum + s.insights.length, 0);
    const duration = Math.round((Date.now() - started) / 1000);
    // 口径一致性:双方锚点 vs 单人判断
    const soloA = buildBaziJudgment(chartA, (await import("../app/myfate-bazi-profile")).buildBaziLifeProfile(chartA));
    const consistencyOk = dual.persons.A.strengthLevel === soloA.anchors.strength.level && dual.persons.A.patternName === soloA.anchors.pattern.name;
    results.push({ id: pair.id, ok: true, duration, fieldCount, violations, consistencyOk, report: parsed, fullText: JSON.stringify(parsed.sections), dual });
    writeFileSync(`test-reports/v3/${pair.id}.json`, JSON.stringify({
      pair,
      relation: { dayMaster: dual.relation.dayMasterText, combo: dual.relation.strengthComboText, complement: dual.relation.wuxingComplementText, cross: dual.relation.crossRelationTexts },
      report: parsed,
    }, null, 1));
    console.log(`  ✔ ${duration}s | ${fieldCount}字段 | 口径一致${consistencyOk ? "✓" : "✗"} | 违规 ${violations.length}${violations.length ? ":" + violations.map((v) => `[${v.section}${v.field ? ":" + v.field : ""}]${v.rule}`).join(",") : ""}`);
  } catch (error) {
    results.push({ id: pair.id, ok: false, duration: Math.round((Date.now() - started) / 1000), error: String(error) });
    console.log(`  ✘ 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 旧管线产物回归:单管线时代生成的 dual-regression.json 仍须过 dualReadingSchema
let legacy = { checked: 0, pass: 0 };
try {
  const legacyReport = JSON.parse(readFileSync("test-reports/v3/dual-regression.json", "utf8"));
  legacy.checked = 1;
  if (dualReadingSchema.safeParse(legacyReport).success) legacy.pass = 1;
} catch { legacy.checked = 0; }

const okResults = results.filter((r) => r.ok);
const sims = [];
for (let i = 0; i < okResults.length; i += 1) {
  for (let j = i + 1; j < okResults.length; j += 1) {
    sims.push({ a: okResults[i].id, b: okResults[j].id, score: Math.round(similarity(okResults[i].fullText, okResults[j].fullText) * 100) / 100 });
  }
}
const allViolations = results.flatMap((r) => r.ok ? r.violations.map((v) => `${r.id}[${v.section}${v.field ? ":" + v.field : ""}]${v.rule}:${v.detail}`) : []);
const summary = {
  生成: { 成功: `${results.filter((r) => r.ok).length}/${results.length}`, 总耗时秒: Math.round((Date.now() - t0) / 1000) },
  一致性: { 剩余违规: allViolations.length, 明细: allViolations.slice(0, 15) },
  口径一致: okResults.every((r) => r.consistencyOk) ? "全部通过(与单人 V3 同锚点)" : "存在不一致",
  个性化: { 跨对相似度: sims },
  旧管线回归: legacy,
};
writeFileSync("test-reports/v3/dual-summary.json", JSON.stringify(summary, null, 1));
console.log("\n════ 双人 V3 汇总 ════");
console.log(JSON.stringify(summary, null, 1));
