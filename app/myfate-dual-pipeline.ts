// ── 双人合盘 V3 按章并行生成管线 ────────────────────────────────────────
// 与个人 V3 同构:双盘各自由规则层 buildBaziJudgment 出锚点(口径与单人报告完全
// 一致)→ buildDualJudgment 补跨盘关系 → 9 章并行生成(每章注入双方锚点+关系锚点+
// 本章字段规则)→ 组装 dualReadingSchema(dual-reading-v1,前端零改动)→
// 双人一致性校验 → 违规章节定向重生成。编排内核复用 section-pipeline-core。
// 旧 generateDualReading(myfate-dual-reading.ts)保留导出,scripts 预览仍可用。

import { BANNED_STYLE_WORDS } from "./myfate-static-reading";
import {
  DUAL_DEFAULT_CHAR_LIMIT,
  dualReadingSchema, dualSectionSchema, dualSectionKeys, type DualReading,
} from "./myfate-dual-reading";
import { extractJson, parseModelJson } from "./myfate-static-reading";
import { runSectionPipeline, withSectionTimeout } from "./section-pipeline-core";
import { checkDualConsistency } from "./bazi-rules/dual-consistency";
import {
  DUAL_SECTION_TITLES, dualFieldSpecsOfSection, resolveDualLabel,
  type DualFieldSpec, type DualSectionKey,
} from "./bazi-rules/dual-field-specs";
import { tenGodMutualView, type DualBaziJudgment, type DualPerson } from "./bazi-rules/dual-judgment";

type CallModel = (system: string, prompt: string) => Promise<string>;
type DualSectionDraft = { title: string; insights: Array<{ label: string; content: string }> };

/** 修复耗尽即失败的硬性规则 */
const DUAL_FATAL_RULES = new Set([
  "章节缺失", "字段结构与顺序", "旺衰口径冲突", "张冠李戴", "喜忌缺失",
  "干支不存在", "流年越界", "引用不存在的关系", "宿命断言",
]);

// ── 系统提示词(V3 双人版):规则层负责判断,AI 只做翻译 ──────────────────
export const DUAL_SECTION_SYSTEM_PROMPT = `你是精通传统子平八字与现代亲密关系的资深合婚分析师。排盘引擎与命理规则层已完成确定性计算(双方各自命盘+跨盘关系),你的任务是把给定结构与结论翻译成这对关系读得懂、有针对性的文字——像经验丰富的命理师当面解读这对关系。
写作规则:
1. 锚点原样引用:【全局锚点】中双方的旺衰档位、格局名、喜用忌神五行,以及关系锚点(日主生克方向/旺衰组合/互补定性/夫妻宫互看),必须原样引用;不得改判、不得输出锚点之外的档位或五行归类。
2. 只用给定事实:四柱干支、藏干十神、跨盘合冲刑害、大运流年一律以【本章事实】为准;跨盘关系只解读【关系事实】里给出的条目,不得补造;证据不足时降低判断强度,不编造。
3. 全程用双方姓名称呼(不用"你/你们/TA");每字段第一句是结论句;术语后紧跟白话。
4. 张冠李戴零容忍:甲方的定性只能用甲方的锚点,乙方同理;两人名字与各自判断严格对应。
5. 不写宿命断言:不用"克夫克妻""注定结婚/离婚/分手""天生一对""一定会"等措辞;未来节奏只依据给定的流年信号清单,年份不编造、区间外不写。
6. 内容具体:杜绝"需要多沟通""互相包容"式空话;摩擦点必须配可执行化解处方;每条判断扣盘面依据。
7. 合盘不捧不吓:优势与消耗并存,互补与课题都写透;开头句式多样,不得每字段同款开头。
8. 核心结论词用中文引号「」标注(匹配定调等级、双方旺衰档位等),仅用于结论词,不滥用。
9. 输出必须是单个 JSON 对象(仅本章结构),不要 Markdown;字符串值内部禁止英文双引号(")和反斜杠,引用措辞一律用「」;不要尾逗号。`;

// ── 视图构造 ────────────────────────────────────────────────────────────
function personAnchorLines(person: DualPerson, label: string): string[] {
  return [
    `- ${label}日主:${person.dayMaster}(${person.dayElement},${person.yinYang}干),四柱${person.pillars.map((p) => p.ganzhi).join(" ")}`,
    `- ${label}旺衰:「${person.strengthLevel}」 | 格局:「${person.patternName}」(${person.patternTier})`,
    `- ${label}喜用:${person.favorable.join("、")};忌:${person.cautious.join("、")};调候:${person.tiaoHouState}`,
    `- ${label}十神排序:${person.tenGodsText}`,
  ];
}

function anchorBlock(judgment: DualBaziJudgment): string {
  const { nameA, nameB } = judgment.meta;
  return [
    ...personAnchorLines(judgment.persons.A, `${nameA}·`),
    ...personAnchorLines(judgment.persons.B, `${nameB}·`),
    `- 关系锚点:${judgment.relation.dayMasterText}`,
    `- ${judgment.relation.strengthComboText}`,
    `- ${judgment.relation.wuxingComplementText}`,
    `- 夫妻宫互看:${judgment.relation.spousePalaceText}`,
  ].join("\n");
}

function dualSectionFacts(judgment: DualBaziJudgment, key: DualSectionKey): string {
  const { nameA, nameB } = judgment.meta;
  const personsFact = (person: DualPerson, label: string) => [
    `${label}四柱:${person.pillars.map((p) => `${p.ganzhi}(${p.shiShenGan},藏干${p.hideGan.join("、")})`).join("、")}`,
    `${label}五行计数:${Object.entries(person.wuXing).map(([k, v]) => `${k}${v}`).join("、")}`,
    `${label}十神排序:${person.tenGodsText}`,
  ];
  const dayunFact = (person: DualPerson, label: string) =>
    `${label}大运:${person.dayun.map((d) => `${d.ganzhi}(${d.ageText}${d.current ? ",当前" : ""})`).join("、")}`;

  switch (key) {
    case "overview":
      return `【关系事实】${judgment.relation.dayMasterText}\n${judgment.relation.strengthComboText}\n${judgment.relation.wuxingComplementText}\n【跨盘干支互动】${judgment.relation.crossRelationTexts.join(";") || "两盘之间没有合冲刑害,关系结构平稳"}`;
    case "profiles":
      return `【${nameA}】\n${personsFact(judgment.persons.A, `${nameA}·`).join("\n")}\n【${nameB}】\n${personsFact(judgment.persons.B, `${nameB}·`).join("\n")}`;
    case "attraction":
      return `【日主关系】${judgment.relation.dayMasterText}\n【十神互见】${tenGodMutualView(judgment)}\n【夫妻宫互看】${judgment.relation.spousePalaceText}\n【跨盘干支互动】${judgment.relation.crossRelationTexts.join(";") || "无明显跨盘互动"}`;
    case "dynamics":
      return `【旺衰组合】${judgment.relation.strengthComboText}\n【日主关系】${judgment.relation.dayMasterText}\n【${nameA}十神排序】${judgment.persons.A.tenGodsText}\n【${nameB}十神排序】${judgment.persons.B.tenGodsText}`;
    case "friction":
      return `【跨盘干支互动(摩擦点只解读这里给出的条目)】${judgment.relation.crossRelationTexts.join(";") || "两盘之间没有合冲刑害,结构平稳——写「结构平稳」并指出最需主动经营的点"}\n【互耗方向】${judgment.relation.wuxingComplementText}`;
    case "intimacy":
      return `【夫妻宫互看】${judgment.relation.spousePalaceText}\n【旺衰组合】${judgment.relation.strengthComboText}\n【${nameA}配偶星】${judgment.persons.A.spouseStarText}\n【${nameB}配偶星】${judgment.persons.B.spouseStarText}`;
    case "collaboration":
      return `【互补定性】${judgment.relation.wuxingComplementText}\n【${nameA}十神】${judgment.persons.A.tenGodsText}\n【${nameB}十神】${judgment.persons.B.tenGodsText}\n【跨盘干支互动】${judgment.relation.crossRelationTexts.join(";") || "无"}`;
    case "family":
      return `【${nameA}】${personsFact(judgment.persons.A, `${nameA}·`).join(";")}\n【${nameB}】${personsFact(judgment.persons.B, `${nameB}·`).join(";")}`;
    case "rhythm":
      return `【逐年关系信号(只可引用区间 ${judgment.relation.annualRange} 内年份)】\n${judgment.relation.annualSync.map((y) => y.note).join("\n")}\n${dayunFact(judgment.persons.A, nameA)}\n${dayunFact(judgment.persons.B, nameB)}`;
  }
}

function dualFieldRuleText(spec: DualFieldSpec, nameA: string, nameB: string): string {
  const label = resolveDualLabel(spec.id, nameA, nameB);
  const lines = [
    `${spec.order}. ${label}(上限${spec.lengthLimit}字)——${spec.title}`,
    `   结构:${spec.writingStructure}`,
  ];
  if (spec.interpretationRules.length) lines.push(`   推导:${spec.interpretationRules.join(";")}`);
  if (spec.triggerConditions) lines.push(`   触发:${spec.triggerConditions}`);
  if (spec.prohibited.length) lines.push(`   禁止:${spec.prohibited.join(";")}`);
  if (spec.evidence.length) lines.push(`   依据来源:${spec.evidence.map((id) => (id.endsWith(".") ? `${id} 开头` : id)).join("、")}`);
  return lines.join("\n");
}

export function buildDualSectionPrompt(judgment: DualBaziJudgment, key: DualSectionKey, retryNote?: string): string {
  const { nameA, nameB } = judgment.meta;
  const specs = dualFieldSpecsOfSection(key);
  const limits = specs.map((spec) => `${resolveDualLabel(spec.id, nameA, nameB)}${spec.lengthLimit}`).join("、");
  const structure = JSON.stringify({
    title: DUAL_SECTION_TITLES[key],
    insights: specs.map((spec) => ({ label: resolveDualLabel(spec.id, nameA, nameB), content: "完整解读段落" })),
  }, null, 1);
  return `请依据下面的排盘判断,生成《MeVerse 双人合盘报告》的「${DUAL_SECTION_TITLES[key]}」章节,只输出本章的 JSON 对象。文中一律用「${nameA}」「${nameB}」称呼双方。

【全局锚点(必须原样引用,不得改判)】
${anchorBlock(judgment)}

【本章事实】
${dualSectionFacts(judgment, key)}

【本章字段规则】insights 按下列字段顺序组织,label 用字段名,不增不减不改序:
${specs.map((spec) => dualFieldRuleText(spec, nameA, nameB)).join("\n")}

【表达层硬约束】
- 语气:资深合婚分析师——克制、具体、有判断力;每字段第一句必须是结论句。
- 禁用词:${BANNED_STYLE_WORDS.join("/")};每字段感叹号最多2个;不用"你/你们",只用双方姓名。
- 各字段字数上限(超出即违规):${limits};其余字段${DUAL_DEFAULT_CHAR_LIMIT}。超限先删修饰语,不删盘面依据。

【输出 JSON 结构】(只输出本章对象,结构必须与此一致)
${structure}${retryNote ? `\n\n【上次输出未通过校验,必须修正】\n${retryNote}\n请修正以上问题后重新输出完整本章 JSON。` : ""}`;
}

// ── 单章生成 ────────────────────────────────────────────────────────────
async function generateDualSection(
  callModel: CallModel,
  system: string,
  judgment: DualBaziJudgment,
  key: DualSectionKey,
  retryNote?: string,
): Promise<DualSectionDraft> {
  const prompt = buildDualSectionPrompt(judgment, key, retryNote);
  const raw = await withSectionTimeout(`双人章节 ${key}`, 150_000, () => callModel(system, prompt));
  const parsed = parseModelJson(extractJson(raw));
  const draft = dualSectionSchema.parse(parsed);
  const { nameA, nameB } = judgment.meta;
  const expected = dualFieldSpecsOfSection(key).map((spec) => resolveDualLabel(spec.id, nameA, nameB));
  const actual = draft.insights.map((item) => item.label);
  if (actual.join("|") !== expected.join("|")) {
    throw new Error(`字段结构与顺序不符:期望[${expected.join("、")}],实际[${actual.join("、")}]`);
  }
  return draft as DualSectionDraft;
}

/**
 * 双人 V3 主入口:9 章并行 → 失败章定向重试 → 组装 → 双人一致性校验 → 定向修复。
 * 输出 dual-reading-v1(dualReadingSchema),前端/历史报告/追问零改动。
 */
export async function generateDualReadingV3(
  callModel: CallModel,
  judgment: DualBaziJudgment,
): Promise<DualReading> {
  const system = DUAL_SECTION_SYSTEM_PROMPT;
  return runSectionPipeline<DualSectionKey, DualReading>({
    sectionKeys: dualSectionKeys,
    generate: (key, retryNote) => generateDualSection(callModel, system, judgment, key, retryNote),
    assemble: (sections) => dualReadingSchema.parse({
      schemaVersion: "dual-reading-v1",
      sections: Object.fromEntries(dualSectionKeys.map((key) => [key, sections[key] as DualSectionDraft | undefined])),
    }),
    check: (report) => checkDualConsistency(report, judgment),
    fatalRules: DUAL_FATAL_RULES,
  });
}
