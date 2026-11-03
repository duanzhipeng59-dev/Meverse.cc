// 命理规则层 + V3 生成管线单元测试(确定性,无 AI 调用)。
// 运行:npm run test:bazi-rules(esbuild bundle 后 node --test)。
// 管线编排用 mock callModel 验证:按章生成、组装、一致性校验与定向重生成路径。
import assert from "node:assert/strict";
import test from "node:test";
import { Solar } from "lunar-javascript";

import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { ZHI_HIDDEN } from "../app/bazi-rules/constants";
import { judgeStrength, fuYongOf } from "../app/bazi-rules/strength";
import { judgePattern } from "../app/bazi-rules/pattern";
import { scanPillarRelations } from "../app/bazi-rules/relations";
import { buildBaziJudgment } from "../app/bazi-rules/judgment";
import { FIELD_SPECS, FIELD_COUNT, SECTION_TITLES } from "../app/bazi-rules/field-specs";
import { checkConsistency } from "../app/bazi-rules/consistency";
import { generateStaticReadingV3 } from "../app/myfate-section-pipeline";
import { staticReadingSchema } from "../app/myfate-static-reading";

const CITY = { id: "bj", name: "北京", lat: 39.9, lon: 116.4, tz: "Asia/Shanghai" };
const chartOf = (birthDate, birthTime, gender = "male") =>
  buildBaziChart({ birthDate, birthTime, gender, city: CITY });
const judgmentOf = (birthDate, birthTime, gender = "male") => {
  const chart = chartOf(birthDate, birthTime, gender);
  return buildBaziJudgment(chart, buildBaziLifeProfile(chart));
};

// lunar-javascript 藏干表(与库源码 ZHI_HIDE_GAN 一致,顺序即本/中/余,用于双向核对)
const LIB_HIDE_GAN = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"], 午: ["丁", "己"],
  未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"],
  戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};

// ── 1. 藏干表与 lunar-javascript 对齐(防漂移) ──
test("藏干表(本/中/余)与 lunar-javascript 一致", () => {
  for (const [zhi, items] of Object.entries(ZHI_HIDDEN)) {
    assert.deepEqual(items.map((item) => item.stem), LIB_HIDE_GAN[zhi], `${zhi} 藏干表与库不一致`);
    assert.ok(items[0].grade === "本气" && items[0].weight === 3, `${zhi} 本气权重应为3`);
    for (const item of items) {
      assert.ok(["本气", "中气", "余气"].includes(item.grade));
      assert.ok(item.weight >= 1 && item.weight <= 3);
    }
  }
});

// ── 2. 基准盘四柱 ──
test("基准盘 2002-07-19 04:10 → 壬午 丁未 戊子 甲寅", () => {
  const chart = chartOf("2002-07-19", "04:10");
  assert.equal(chart.pillars.map((p) => p.ganzhi).join(" "), "壬午 丁未 戊子 甲寅");
});

// ── 3. 旺衰与格局(探查确认的固定盘) ──
test("旺衰与格局判定覆盖强弱从与禄刃", () => {
  const cases = [
    // [date, time, 旺衰档, 格局名, 格局成色]
    ["2002-07-19", "04:10", "偏强", "正印格", "中气透出"],   // 基准盘:戊日未月,丁透
    ["1950-07-15", "12:00", "身弱", "偏印格", "藏而不透"],   // 辛日未月
    ["1954-03-01", "04:10", "身强", "偏印格", "本气透出"],   // 丙日寅月,甲(偏印)透
    ["1954-02-15", "12:00", "从弱", "从财格", "从格取势"],   // 壬水无根无助,火势主导
    ["1953-06-15", "04:10", "中和", "建禄格", "藏而不透"],   // 丁日午月禄地
    ["1951-06-15", "04:10", "偏强", "阳刃格", "藏而不透"],   // 丙日午月刃地
    ["1951-03-01", "12:00", "身弱", "偏财格", "藏而不透"],   // 庚日寅月
    ["1956-12-15", "04:10", "偏弱", "正官格", "藏而不透"],   // 丙日子月
  ];
  for (const [date, time, level, pattern, tier] of cases) {
    const chart = chartOf(date, time);
    const strength = judgeStrength(chart);
    assert.equal(strength.level, level, `${date} 旺衰应为${level},实得${strength.level}(${strength.score.ratio})`);
    const pattern2 = judgePattern(chart, strength);
    assert.equal(pattern2.name, pattern, `${date} 格局应为${pattern},实得${pattern2.name}`);
    assert.equal(pattern2.tier, tier, `${date} 成色应为${tier}`);
  }
});

// ── 4. 扶抑喜忌方向 ──
test("扶抑喜忌:身强克泄耗、身弱生扶、从弱顺势", () => {
  const strong = judgmentOf("1954-03-01", "04:10");   // 丙火身强
  assert.equal(strong.anchors.strength.level, "身强");
  const drainPool = ["水", "土", "金"];               // 丙日:官杀水/食伤土/财金
  assert.ok(strong.anchors.fuYong.favorable.every((el) => drainPool.includes(el)), `身强喜用应在克泄耗中,实得${strong.anchors.fuYong.favorable}`);
  assert.ok(strong.anchors.fuYong.cautious.includes("木"), "身强忌印(木)");
  const fu = fuYongOf(chartOf("1954-03-01", "04:10"), judgeStrength(chartOf("1954-03-01", "04:10")));
  assert.ok(fu.favorable.length === 2 && fu.cautious.length === 2, "喜忌各两行");

  const weak = judgmentOf("1950-07-15", "12:00");     // 辛金身弱
  assert.equal(weak.anchors.strength.level, "身弱");
  assert.ok(weak.anchors.fuYong.favorable.includes("土"), "身弱喜印(土生辛)");
  assert.ok(weak.anchors.fuYong.favorable.includes("金"), "身弱喜比劫(金)");

  const follow = judgmentOf("1954-02-15", "12:00");   // 壬水从财
  assert.ok(follow.anchors.fuYong.cautious.includes("金") && follow.anchors.fuYong.cautious.includes("水"), "从弱忌帮扶(印金比劫水)");
});

// ── 5. 调候 ──
test("调候:亥月水重判寒用火、午月火重判热用水", () => {
  const cold = judgmentOf("1955-11-20", "04:10");     // 乙未 丁亥 乙酉 戊寅
  assert.ok(["偏寒", "过寒"].includes(cold.anchors.tiaoHou.state), `亥月应判寒,实得${cold.anchors.tiaoHou.state}`);
  assert.equal(cold.anchors.tiaoHou.yongShen, "火");
  const hot = judgmentOf("1956-06-20", "04:10");      // 丙申 甲午 戊午 甲寅
  assert.ok(["偏热", "过热"].includes(hot.anchors.tiaoHou.state), `午月应判热,实得${hot.anchors.tiaoHou.state}`);
  assert.equal(hot.anchors.tiaoHou.yongShen, "水");
});

// ── 6. 关系:三合全与双向刑 ──
test("三合全与半合被检出", () => {
  const chart = chartOf("1956-12-15", "04:10");       // 丙申 庚子 丙辰 庚寅:申子辰全
  const hits = scanPillarRelations(chart.pillars.map((p) => ({ label: p.label, ganzhi: p.ganzhi })));
  assert.ok(hits.some((hit) => hit.type === "sanhe" && hit.element === "水"), "申子辰应检出三合水局");
});

test("相刑按无序对判定(巳寅反序不漏)", () => {
  const chart = chartOf("1950-02-15", "10:00");       // 庚寅 戊寅 辛巳 癸巳:寅巳刑
  const hits = scanPillarRelations(chart.pillars.map((p) => ({ label: p.label, ganzhi: p.ganzhi })));
  assert.ok(hits.some((hit) => hit.type === "xing"), "寅巳刑应命中(无序对)");
});

// ── 7. 流年干支与库一致 ──
test("流年干支公式与 lunar-javascript 年柱一致", () => {
  const j = judgmentOf("2002-07-19", "04:10");
  for (const year of [2026, 2027, 2030, 2035]) {
    const lib = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar().getYearInGanZhi();
    assert.equal(j.facts.annual.find((item) => item.year === year)?.ganzhi, lib, `${year}年干支应与库一致`);
  }
});

// ── 8. 判断对象完整性 ──
test("判断对象:35字段、evidence id 合法、timelines 完整", () => {
  const j = judgmentOf("2002-07-19", "04:10");
  assert.equal(FIELD_COUNT, 35);
  const idRe = /^(chart|structure|tenGod|relation|area|shensha)\.[a-zA-Z0-9_-]+$/u;
  for (const item of j.evidence) assert.match(item.id, idRe);
  assert.ok(j.evidence.length >= 20, `evidence 应≥20条,实得${j.evidence.length}`);
  assert.ok(j.timelines.career.dayun.length >= 6, "大运时间轴应≥6步");
  assert.equal(j.timelines.career.annual.length, 10, "流年时间轴应为10年");
  for (const item of j.timelines.career.dayun) {
    assert.ok(item.theme.length >= 8 && item.opportunity.length >= 8 && item.watch.length >= 8 && item.action.length >= 8);
    assert.ok(item.score >= 30 && item.score <= 98);
  }
  assert.equal(new Set(j.evidence.map((e) => e.id)).size, j.evidence.length, "evidence id 不得重复");
});

// ── 9. 字段表与既有模板的兼容基准 ──
test("35 字段名与顺序与现有模板一致", () => {
  const expected = {
    portrait: ["旺衰定性", "道法与喜忌", "喜神", "忌神", "闲神", "神煞底色", "性格与行为模式"],
    pattern: ["月令格局", "命盘结构特征", "结构清浊"],
    education: ["学历评估", "适合专业", "考运关键节点"],
    career: ["职业方向", "管理与领导力", "贵人/小人/与上级", "一生事业轨迹", "近期流年事业"],
    wealth: ["一生财富高度", "主要获财方式", "一生财富大运", "近期财富流年"],
    relationship: ["配偶特征", "对方家庭/配偶父母", "婚姻稳定性", "一生婚恋大运", "近期感情流年"],
    wellbeing: ["身体薄弱器官", "心理健康倾向"],
    children: ["子女缘分", "子女性别倾向", "子女发展"],
    family: ["父亲", "母亲", "兄弟姐妹"],
  };
  for (const [section, labels] of Object.entries(expected)) {
    const actual = FIELD_SPECS.filter((s) => s.section === section).sort((a, b) => a.order - b.order).map((s) => s.id);
    assert.deepEqual(actual, labels, `${SECTION_TITLES[section]}字段清单不符`);
  }
});

// ── 共用:完全合规的 35 字段内容生成器(mock 与一致性测试共用) ──
// 轮换句式按字段全局序号取用,确保 mock 文案不触发跨字段重复规则
const MOCK_TAILS = [
  "更强调边界取舍,先稳后进。",
  "偏积累型,慢热出成果。",
  "张力在内外温差,外松内紧。",
  "走长线,深耕少切换。",
  "互动温和,宜缓不宜急。",
  "讲配合,靠协作放大。",
  "有主有次,聚焦主线。",
  "重心在中后段,厚积薄发。",
  "劲头外放,容易被看见。",
  "清而有锋,适合攻坚。",
  "互为牵制,讲究平衡。",
  "底子稳,是慢功夫。",
];

// 三模板 × 12 句尾 × 12 主体段:每个字段的组合互不相同,mock 文案两两结构不同
const MOCK_BODIES = [
  "这一读法在现实里对应稳态推进的节奏,",
  "落在日常是先搭框架再补细节的习惯,",
  "其现实含义是把长处用在对的场景,",
  "对应到选择上,讲究时机而非力度,",
  "在人际层面表现为留余地的分寸感,",
  "这一层含义在压力情境下更明显,",
  "它提示的是路径偏好而非能力上限,",
  "放在具体事务上,宜做减法,",
  "这一配置的影响偏间接,",
  "它的作用随阶段递进,",
  "其价值在复利,不在爆发,",
  "这一解读偏保守,稳妥优先,",
];

function styledDefault(j, spec) {
  const gz = j.facts.pillars[0].ganzhi;
  const idx = FIELD_SPECS.indexOf(spec);
  const tail = MOCK_TAILS[Math.floor(idx / 3) % MOCK_TAILS.length];
  const body = MOCK_BODIES[(idx + Math.floor(idx / MOCK_BODIES.length)) % MOCK_BODIES.length];
  const template = idx % 3;
  if (template === 0) return `${spec.id}的结论「定调」。${body}依据${gz},${tail}`;
  if (template === 1) return `从命局结构来看,${spec.id}的这一配置取「定调」;${body}${tail}依据${gz}。`;
  return `${tail}——落到${spec.id}上,取「定调」二字,${body}依据${gz}。`;
}

function compliantContent(j, spec) {
  const a = j.anchors;
  const gz2 = j.facts.pillars[2].ganzhi;
  switch (spec.id) {
    case "喜神":
      return a.fuYong.favorable.map((el) => `${el}（十神,带来定力）`).join("、");
    case "忌神":
      return a.fuYong.cautious.map((el) => `${el}（十神,带来消耗）`).join("、");
    case "闲神":
      return a.idle.length ? `${a.idle.join("、")}（十神）起头,中性作用,边界一句带过。` : "无闲神,全局非喜即忌,取用方向明确。";
    case "旺衰定性":
      return `你的命局属于「${a.strength.level}」。从命局结构来看,依据${gz2},行为上表现为主导与克制并存。`;
    case "道法与喜忌": {
      const label = a.tenGods[0].category === "比劫" ? "比劫配财" : a.tenGods[0].category === "印星" ? "印配食伤" : "食伤配印";
      return `道法标签「${label}」。${styledDefault(j, spec).slice(spec.id.length)}`;
    }
    case "月令格局":
      return `「${a.pattern.name}」(${a.pattern.tier}),依据${gz2}藏干透出,路径含义聚焦;但路径的成色也要靠大运配合,聚焦主线是关键。`;
    case "一生财富高度":
      return `以下为纯天赋计算值,未考虑地域/家庭/社会等因素影响,仅供参考。你的财富量级在 ${a.wealthTier.range} 之间「${a.wealthTier.range}」,档位${a.wealthTier.tier}。`;
    case "子女性别倾向":
      return `命法依据(${a.childrenStar.category}),引用具体十神状态,倾向「生女孩」概率稍大,依据${gz2}。(准确率约60-70%,仅供参考)`;
    case "近期感情流年":
      return j.facts.annual.map((y) => `${y.year}年（${y.ganzhi}）· 缘分概率60%:平稳推进`).join(";");
    case "一生事业轨迹":
    case "近期流年事业":
    case "一生财富大运":
    case "近期财富流年":
    case "一生婚恋大运":
      return j.facts.dayun.map((d) => `${d.ganzhi}大运（${d.ageText}）:70分。定调与注意事项`)
        .concat(j.facts.annual.map((y) => `${y.year}年（${y.ganzhi}）· 评分70分:动向`)).join(";");
    case "考运关键节点":
      return j.facts.annual.slice(0, 4).map((y) => `${y.year}年（${y.ganzhi}）思维活跃`).join("、");
    case "身体薄弱器官":
      return `「肝胆机能」「呼吸系统」是值得留意的倾向,按五行偏枯只写倾向不下诊断。${styledDefault(j, spec)}`;
    default:
      return styledDefault(j, spec);
  }
}

function compliantReport(judgment, overrides = {}) {
  const sections = {};
  for (const spec of FIELD_SPECS) {
    const sec = sections[spec.section] ??= { title: SECTION_TITLES[spec.section], insights: [], advice: ["保持节奏,按季度复盘。"] };
    sec.insights.push({ label: spec.id, content: overrides[spec.id] ?? compliantContent(judgment, spec) });
  }
  return {
    schemaVersion: "single-full-v3", scope: "full-reading", sections,
    evidence: judgment.evidence, timelines: judgment.timelines,
    disclaimer: "本报告基于传统命理文化,仅供自我观察参考,不构成科学预测或决策依据。",
  };
}

// ── 10. 一致性校验的关键规则 ──
test("一致性校验:锚点冲突/干支不存在/绝对化/越界年份被拦截,合规报告零违规", () => {
  const j = judgmentOf("2002-07-19", "04:10");
  const dirty = compliantReport(j, {
    月令格局: `「七杀格」成色足,依据${j.facts.pillars[1].ganzhi}。`,
    性格与行为模式: `引用不存在的干支「甲子」作为依据,风格外放。`,
    心理健康倾向: `你注定会成功,抗压能力强。`,
    考运关键节点: `2040年思维最活跃,依据${j.facts.pillars[0].ganzhi}。`,
  });
  const violations = checkConsistency(staticReadingSchema.parse(dirty), j);
  const rules = violations.map((v) => v.rule);
  assert.ok(rules.includes("格局名冲突"), `应拦格局冲突,实得:${rules.join(",")}`);
  assert.ok(rules.includes("干支不存在"), "应拦不存在干支");
  assert.ok(rules.includes("绝对化措辞"), "应拦绝对化措辞");
  assert.ok(rules.includes("流年越界"), "应拦越界年份");

  const clean = staticReadingSchema.parse(compliantReport(j));
  assert.deepEqual(checkConsistency(clean, j), [], `合规报告不应有违规:${JSON.stringify(checkConsistency(clean, j))}`);
});

// ── 11. 管线编排(mock 模型):按章生成、定向修复、fatal 拦截 ──
const SECTION_NAME_TO_KEY = { 人生画像: "portrait", 格局: "pattern", 学业: "education", 事业: "career", 财富: "wealth", 感情: "relationship", 健康: "wellbeing", 子女: "children", 六亲: "family" };

function mockCallModel(judgment, callCounts, hooks = {}) {
  return async (_system, prompt) => {
    const name = Object.keys(SECTION_NAME_TO_KEY).find((n) => prompt.includes(`的「${n}」章节`));
    assert.ok(name, "prompt 应能识别章节");
    assert.ok(prompt.includes("【全局命理结论(锚点,必须原样引用,不得改判)】"), "prompt 应含锚点块");
    assert.ok(prompt.includes(judgment.anchors.pattern.name), "prompt 应含格局锚点");
    assert.ok(prompt.includes(judgment.anchors.strength.level), "prompt 应含旺衰锚点");
    const key = SECTION_NAME_TO_KEY[name];
    callCounts[key] = (callCounts[key] ?? 0) + 1;
    const section = compliantReport(judgment).sections[key];
    const mutated = hooks.mutate?.(key, section, prompt);
    return JSON.stringify(mutated ?? section);
  };
}

test("管线:9 章并行生成(mock),零违规一次通过", async () => {
  const j = judgmentOf("2002-07-19", "04:10");
  const callCounts = {};
  const report = await generateStaticReadingV3(mockCallModel(j, callCounts), j);
  assert.equal(Object.values(callCounts).reduce((sum, n) => sum + n, 0), 9, "应恰好 9 次调用");
  staticReadingSchema.parse(report);
  assert.deepEqual(checkConsistency(report, j), [], "mock 合规内容应零违规");
  assert.equal(Object.keys(report.sections).length, 9);
  assert.equal(report.sections.portrait.insights.length, 7);
});

test("管线:单章违规只定向重生成该章(不重写整篇)", async () => {
  const j = judgmentOf("2002-07-19", "04:10");
  const callCounts = {};
  let brokenOnce = false;
  const callModel = mockCallModel(j, callCounts, {
    mutate: (key, section, prompt) => {
      // 首次生成健康章时去掉「」结论词 → 触发"缺少「」结论词"违规;带重试提示的调用返回合规内容
      if (key === "wellbeing" && !brokenOnce && !prompt.includes("上次输出未通过校验")) {
        return { ...section, insights: section.insights.map((i) => ({ ...i, content: i.content.replace(/[「」]/g, "") })) };
      }
      if (key === "wellbeing" && prompt.includes("上次输出未通过校验")) brokenOnce = true;
      return undefined;
    },
  });
  const report = await generateStaticReadingV3(callModel, j);
  assert.ok(brokenOnce, "违规章应收到重试提示并被重生成");
  assert.equal(callCounts.wellbeing, 2, "违规章应恰好重生成 1 次");
  for (const key of ["portrait", "pattern", "career", "wealth"]) assert.equal(callCounts[key], 1, `${key} 不应被重写`);
  staticReadingSchema.parse(report);
  assert.deepEqual(checkConsistency(report, j), []);
});

test("管线:硬性违规(格局名冲突)修复耗尽后抛错", async () => {
  const j = judgmentOf("2002-07-19", "04:10");
  const callModel = mockCallModel(j, {}, {
    mutate: (key, section) => {
      if (key !== "pattern") return undefined;
      return { ...section, insights: section.insights.map((i) =>
        i.label === "月令格局" ? { ...i, content: `「七杀格」成色足,依据${j.facts.pillars[1].ganzhi}。` } : i) };
    },
  });
  await assert.rejects(() => generateStaticReadingV3(callModel, j), /一致性校验未通过/);
});
