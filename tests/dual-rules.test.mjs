// 双人合盘 V3 规则层 + 生成管线单元测试(确定性,无 AI 调用)。
// 运行:npm run test:dual-rules(esbuild bundle 后 node --test)。
// 覆盖:23 字段与动态 label、双方锚点与单人 V3 口径一致、跨盘事实(日主关系/
// 旺衰组合/互补定性/夫妻宫互看/跨盘冲/逐年信号)、一致性校验规则、管线编排三路径。
import assert from "node:assert/strict";
import test from "node:test";

import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { buildBaziJudgment } from "../app/bazi-rules/judgment";
import { buildDualJudgment, tenGodMutualView } from "../app/bazi-rules/dual-judgment";
import { DUAL_FIELD_COUNT, DUAL_FIELD_SPECS, dualExpectedLabels, resolveDualLabel } from "../app/bazi-rules/dual-field-specs";
import { checkDualConsistency } from "../app/bazi-rules/dual-consistency";
import { generateDualReadingV3 } from "../app/myfate-dual-pipeline";
import { dualReadingSchema, dualSectionKeys } from "../app/myfate-dual-reading";

const CITY = { id: "bj", name: "北京", lat: 39.9, lon: 116.4, tz: "Asia/Shanghai" };
// 固定测试对:A 李明(戊日·偏强·正印格) × B 王芳(庚日·身弱·偏财格)
const PAIR = {
  a: { name: "李明", date: "2002-07-19", time: "04:10", gender: "male" },
  b: { name: "王芳", date: "1951-03-01", time: "12:00", gender: "female" },
};
const dualOf = (pair = PAIR) => {
  const chartA = buildBaziChart({ birthDate: pair.a.date, birthTime: pair.a.time, gender: pair.a.gender, city: CITY });
  const chartB = buildBaziChart({ birthDate: pair.b.date, birthTime: pair.b.time, gender: pair.b.gender, city: CITY });
  return { chartA, chartB, dual: buildDualJudgment(chartA, chartB, pair.a.name, pair.b.name) };
};

// ── 1. 23 字段与动态 label ──
test("双人字段表:23 字段、九章齐、动态姓名 label 解析", () => {
  assert.equal(DUAL_FIELD_COUNT, 23);
  const expected = {
    overview: ["匹配定调", "关系关键词", "互补与消耗"],
    profiles: ["{A}的底色", "{B}的底色"],
    attraction: ["五行吸引", "十神互见", "初识磁场"],
    dynamics: ["日常相处", "沟通风格", "付出与回应"],
    friction: ["主要摩擦点", "触发雷区", "化解处方"],
    intimacy: ["夫妻宫互看", "亲密与责任"],
    collaboration: ["搭伙做事", "资源互补", "合作雷区"],
    family: ["家庭接纳", "事务分工"],
    rhythm: ["关系关键年", "养护提醒"],
  };
  for (const [section, ids] of Object.entries(expected)) {
    const actual = DUAL_FIELD_SPECS.filter((s) => s.section === section).sort((a, b) => a.order - b.order).map((s) => s.id);
    assert.deepEqual(actual, ids, `${section} 字段清单不符`);
  }
  const labels = dualExpectedLabels("李明", "王芳");
  assert.deepEqual(labels.profiles, ["李明的底色", "王芳的底色"]);
  assert.equal(resolveDualLabel("{B}的底色", "李明", "王芳"), "王芳的底色");
});

// ── 2. 口径一致性:同一人在单人与双人中锚点相同 ──
test("口径一致:双方锚点与单人 buildBaziJudgment 完全相同", () => {
  const { chartA, dual } = dualOf();
  const solo = buildBaziJudgment(chartA, buildBaziLifeProfile(chartA));
  assert.equal(dual.persons.A.strengthLevel, solo.anchors.strength.level);
  assert.equal(dual.persons.A.patternName, solo.anchors.pattern.name);
  assert.deepEqual(dual.persons.A.favorable, solo.anchors.fuYong.favorable);
  assert.deepEqual(dual.persons.A.cautious, solo.anchors.fuYong.cautious);
  assert.equal(dual.persons.A.tiaoHouState, solo.anchors.tiaoHou.state);
});

// ── 3. 跨盘事实 ──
test("跨盘事实:日主关系/旺衰组合/互补定性/夫妻宫/逐年信号", () => {
  const { dual } = dualOf();
  assert.ok(dual.relation.dayMasterText.includes("生"), "戊土生庚金应为相生方向");
  assert.ok(dual.relation.strengthComboText.includes("强弱互补"), "偏强×身弱应判强弱互补");
  assert.ok(dual.relation.wuxingComplementText.includes("定性:"), "互补定性结论在场");
  assert.ok(dual.relation.spousePalaceText.includes("夫妻宫"), "夫妻宫互看在场");
  assert.ok(dual.relation.crossRelationTexts.some((t) => t.includes("相冲")), "跨盘应检出子午冲(李明年午×王芳日子)");
  const y2026 = dual.relation.annualSync.find((y) => y.year === 2026);
  assert.ok(y2026 && y2026.signals.some((s) => s.includes("冲") && s.includes("夫妻宫")), "2026丙午应命中双方夫妻宫冲");
  assert.ok(dual.evidence.length >= 20, `evidence 应≥20条,实得${dual.evidence.length}`);
  assert.ok(tenGodMutualView(dual).includes("「食神」"), "十神互见应给出具体十神");
});

test("夫妻宫比和判定不误报(不同五行日支不得判比和)", () => {
  // 甲日(戌)× 乙日(卯):戌土 vs 卯木,不同五行 → 不得出现"比和"
  const pair = {
    a: { name: "甲一", date: "1994-10-15", time: "10:00", gender: "male" },
    b: { name: "乙二", date: "1995-04-05", time: "10:00", gender: "female" },
  };
  const { dual } = dualOf(pair);
  assert.ok(!dual.relation.spousePalaceText.includes("比和(同气") || dual.relation.spousePalaceText.includes("六合") || dual.relation.spousePalaceText.includes("相冲"), "比和只应出现在日支同五行时");
});

// ── 4. 一致性校验 ──
const MOCK_TAILS = ["先稳后进。", "慢热出成果。", "外松内紧。", "深耕少切换。", "宜缓不宜急。", "靠协作放大。", "聚焦主线。", "厚积薄发。", "容易被看见。", "适合攻坚。", "讲究平衡。", "是慢功夫。"];

function compliantContent(dual, spec, nameA, nameB) {
  const label = resolveDualLabel(spec.id, nameA, nameB);
  const gz = dual.persons.A.pillars[0].ganzhi;
  const tail = MOCK_TAILS[DUAL_FIELD_SPECS.indexOf(spec) % MOCK_TAILS.length];
  const person = spec.id.startsWith("{A}") ? dual.persons.A : spec.id.startsWith("{B}") ? dual.persons.B : null;
  switch (spec.id) {
    case "匹配定调":
      return `「中上等合婚」。依据${gz}与跨盘互动,互补大于消耗,${tail}`;
    case "关系关键词":
      return "土金相济、强弱互补、节奏错位";
    case "互补与消耗":
      return `${nameA}补${nameB}以资源托底,${nameB}补${nameA}以专业落地;最大消耗在财务边界,${tail}`;
    case "{A}的底色":
      return `${nameA}旺衰「${dual.persons.A.strengthLevel}」,喜用${dual.persons.A.favorable.join("、")},忌神${dual.persons.A.cautious.join("、")},底色${tail}依据${gz}。`;
    case "{B}的底色":
      return `${nameB}旺衰「${dual.persons.B.strengthLevel}」,喜用${dual.persons.B.favorable.join("、")},忌神${dual.persons.B.cautious.join("、")},底色${tail}依据${gz}。`;
    case "关系关键年":
      return dual.relation.annualSync.slice(0, 4).map((y) => `${y.year}年（${y.ganzhi}）· 年度标签:对关系的影响与建议`).join(";");
    case "主要摩擦点":
      return `依据${gz}等跨盘互动,摩擦集中在节奏与财务,${tail}`;
    default:
      if (person) return `${label}的判断:依据${gz},${tail}`;
      return `${label}:结论先行,依据${gz},${tail}`;
  }
}

function compliantDualReport(dual, overrides = {}) {
  const { nameA, nameB } = dual.meta;
  const sections = {};
  for (const key of dualSectionKeys) {
    const specs = DUAL_FIELD_SPECS.filter((s) => s.section === key).sort((a, b) => a.order - b.order);
    sections[key] = { title: key, insights: specs.map((spec) => ({ label: resolveDualLabel(spec.id, nameA, nameB), content: overrides[spec.id] ?? compliantContent(dual, spec, nameA, nameB) })) };
  }
  return dualReadingSchema.parse({ schemaVersion: "dual-reading-v1", sections });
}

test("一致性校验:合规报告零违规,锚点冲突/宿命断言/不存在干支/张冠李戴被拦截", () => {
  const { dual } = dualOf();
  const clean = compliantDualReport(dual);
  assert.deepEqual(checkDualConsistency(clean, dual), [], `合规报告不应有违规:${JSON.stringify(checkDualConsistency(clean, dual))}`);

  const dirty = compliantDualReport(dual, {
    "{A}的底色": `李明旺衰「身弱」,喜用${dual.persons.A.favorable.join("、")},忌神${dual.persons.A.cautious.join("、")}。王芳也在场。`,
    匹配定调: `你们注定结婚,依据${dual.persons.A.pillars[0].ganzhi}。`,
    关系关键词: "引用不存在的干支甲子作为依据",
  });
  const violations = checkDualConsistency(dirty, dual);
  const rules = violations.map((v) => v.rule);
  assert.ok(rules.includes("旺衰口径冲突"), `应拦旺衰冲突,实得:${rules.join(",")}`);
  assert.ok(rules.includes("张冠李戴"), "应拦张冠李戴");
  assert.ok(rules.includes("宿命断言"), "应拦宿命断言");
  assert.ok(rules.includes("干支不存在"), "应拦不存在干支");
});

// ── 5. 管线编排(mock 模型) ──
const SECTION_TITLES = ["合盘总览", "双方底色", "吸引来源", "相处模式", "摩擦与化解", "亲密与责任", "事业财富协作", "家庭六亲", "未来节奏"];
const TITLE_TO_KEY = Object.fromEntries(SECTION_TITLES.map((title, index) => [title, dualSectionKeys[index]]));

function mockDualCallModel(dual, callCounts, hooks = {}) {
  return async (_system, prompt) => {
    const title = SECTION_TITLES.find((t) => prompt.includes(`的「${t}」章节`));
    assert.ok(title, "prompt 应能识别章节");
    assert.ok(prompt.includes("【全局锚点(必须原样引用,不得改判)】"), "prompt 应含锚点块");
    assert.ok(prompt.includes(dual.persons.A.strengthLevel) && prompt.includes(dual.persons.B.strengthLevel), "prompt 应含双方旺衰锚点");
    const key = TITLE_TO_KEY[title];
    callCounts[key] = (callCounts[key] ?? 0) + 1;
    const section = compliantDualReport(dual).sections[key];
    const mutated = hooks.mutate?.(key, section, prompt);
    return JSON.stringify(mutated ?? section);
  };
}

test("管线:9 章并行生成(mock),零违规一次通过", async () => {
  const { dual } = dualOf();
  const callCounts = {};
  const report = await generateDualReadingV3(mockDualCallModel(dual, callCounts), dual);
  assert.equal(Object.values(callCounts).reduce((s, n) => s + n, 0), 9, "应恰好 9 次调用");
  dualReadingSchema.parse(report);
  assert.deepEqual(checkDualConsistency(report, dual), []);
  assert.equal(report.sections.overview.insights.length, 3);
  assert.deepEqual(report.sections.profiles.insights.map((i) => i.label), ["李明的底色", "王芳的底色"]);
});

test("管线:单章违规只定向重生成该章", async () => {
  const { dual } = dualOf();
  const callCounts = {};
  let brokenOnce = false;
  const callModel = mockDualCallModel(dual, callCounts, {
    mutate: (key, section, prompt) => {
      if (key === "overview" && !brokenOnce && !prompt.includes("上次输出未通过校验")) {
        brokenOnce = true;
        return { ...section, insights: section.insights.map((i) => (i.label === "匹配定调" ? { ...i, content: i.content.replace(/[「」]/g, "") } : i)) };
      }
      return undefined;
    },
  });
  const report = await generateDualReadingV3(callModel, dual);
  assert.equal(callCounts.overview, 2, "违规章应恰好重生成 1 次");
  for (const key of ["profiles", "attraction", "rhythm"]) assert.equal(callCounts[key], 1, `${key} 不应被重写`);
  dualReadingSchema.parse(report);
  assert.deepEqual(checkDualConsistency(report, dual), []);
});

test("管线:硬性违规(旺衰口径冲突)修复耗尽后抛错", async () => {
  const { dual } = dualOf();
  const callModel = mockDualCallModel(dual, {}, {
    mutate: (key, section) => {
      if (key !== "profiles") return undefined;
      return { ...section, insights: section.insights.map((i) =>
        i.label.includes("李明") ? { ...i, content: `李明旺衰「身弱」,喜用${dual.persons.A.favorable.join("、")},忌神${dual.persons.A.cautious.join("、")}。` } : i) };
    },
  });
  await assert.rejects(() => generateDualReadingV3(callModel, dual), /一致性校验未通过/);
});
