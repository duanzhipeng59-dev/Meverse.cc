// ── 双人合盘跨章一致性校验(与个人 consistency.ts 同构) ─────────────────
// 结构(九章/23字段含动态姓名 label)、双方锚点一致(旺衰/喜忌/张冠李戴)、
// 实体存在性(干支/年份/大运 ∈ 双方事实集)、跨盘关系存在性、宿命断言、
// 禁词/字数/感叹号、「」结论词、关系关键年格式。违规按章节归并,由管线定向重生成。

import { BANNED_STYLE_WORDS } from "../myfate-static-reading";
import { DUAL_DEFAULT_CHAR_LIMIT, DUAL_FIELD_CHAR_LIMITS, dualSectionKeys, type DualReading } from "../myfate-dual-reading";
import type { DualBaziJudgment } from "./dual-judgment";
import { DUAL_FIELD_SPECS, dualExpectedLabels, resolveDualLabel, type DualSectionKey } from "./dual-field-specs";

export type DualConsistencyViolation = {
  section?: DualSectionKey;
  field?: string;
  rule: string;
  detail: string;
};

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const GAN_ZHI_RE = new RegExp(`[${GAN}][${ZHI}]`, "g");
const YEAR_RE = /(\d{4})年/g;
const EXCLAIM_RE = /！/g;

// 宿命断言(双人专属清单 + 通用绝对化;具体规则在前,"不一定会"经负向断言排除)
const DUAL_FATAL_ASSERTIONS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(克夫|克妻|相克致死|注定(结婚|离婚|分手)|必然(结婚|离婚|分手)|一定会?(结婚|离婚|分手)|天生一对|命中注定的一对)/u, label: "宿命断言" },
  { pattern: /(天生注定|命运必然|无限潜力|只要努力就会成功)/u, label: "通用营销式话术" },
  { pattern: /(?<!不)(一定会|注定|必然|肯定会|绝对会)/u, label: "绝对化措辞" },
];

export function checkDualConsistency(report: DualReading, judgment: DualBaziJudgment): DualConsistencyViolation[] {
  const violations: DualConsistencyViolation[] = [];
  const push = (v: DualConsistencyViolation) => {
    if (violations.length < 30) violations.push(v);
  };
  const { nameA, nameB } = judgment.meta;
  const expected = dualExpectedLabels(nameA, nameB);

  // 事实集:双方四柱/大运/流年干支、合法年份、跨盘关系涉及的支
  const validGanZhi = new Set<string>([
    ...judgment.persons.A.pillars.map((p) => p.ganzhi),
    ...judgment.persons.B.pillars.map((p) => p.ganzhi),
    ...judgment.persons.A.dayun.map((d) => d.ganzhi),
    ...judgment.persons.B.dayun.map((d) => d.ganzhi),
    ...judgment.persons.A.annual.map((y) => y.ganzhi),
    ...judgment.persons.B.annual.map((y) => y.ganzhi),
  ]);
  const validYears = new Set(judgment.relation.annualSync.map((y) => y.year));
  const crossBranches = new Set<string>();
  for (const hit of judgment.relation.crossRelations) {
    crossBranches.add(hit.a.value);
    crossBranches.add(hit.b.value);
  }

  // label → 字段规格(钩子校验用);双方四柱干支单字集(必引干支的宽松认定)
  const specByLabel = new Map(DUAL_FIELD_SPECS.map((spec) => [resolveDualLabel(spec.id, nameA, nameB), spec]));
  const chartChars = new Set<string>();
  for (const person of [judgment.persons.A, judgment.persons.B]) {
    for (const pillar of person.pillars) {
      chartChars.add(pillar.ganzhi[0]);
      chartChars.add(pillar.ganzhi[1]);
    }
  }

  // ── 0. 结构:九章齐全 + 每章 label 与期望(按姓名解析)逐一相符 ──
  for (const key of dualSectionKeys) {
    const section = report.sections[key];
    if (!section) {
      push({ section: key, rule: "章节缺失", detail: `${key} 章未生成` });
      continue;
    }
    const labels = section.insights.map((item) => item.label);
    if (labels.join("|") !== expected[key].join("|")) {
      push({ section: key, rule: "字段结构与顺序", detail: `期望[${expected[key].join("、")}],实际[${labels.join("、")}]` });
    }
  }

  for (const key of dualSectionKeys) {
    const section = report.sections[key];
    if (!section) continue;
    for (const insight of section.insights) {
      const content = insight.content ?? "";
      const spec = specByLabel.get(insight.label);
      // ── 0.5 字段钩子:「」结论词 / 必引干支 ──
      if (spec?.validation.requireQuoteMark && !content.includes("「")) {
        push({ section: key, field: insight.label, rule: "缺少「」结论词", detail: "该字段必须含至少一处「」括注的核心结论" });
      }
      GAN_ZHI_RE.lastIndex = 0;
      if (spec?.validation.mustCiteGanzhi) {
        const pairOk = [...content.matchAll(GAN_ZHI_RE)].some((match) => validGanZhi.has(match[0]));
        const distinctChars = new Set([...content].filter((ch) => chartChars.has(ch)));
        if (!pairOk && distinctChars.size < 2) {
          push({ section: key, field: insight.label, rule: "缺少干支依据", detail: "该字段必须引用具体干支(干支对或至少两个命盘干支字)" });
        }
      }

      // ── 1. 实体存在性:干支对 ──
      for (const match of content.matchAll(GAN_ZHI_RE)) {
        if (!validGanZhi.has(match[0])) {
          push({ section: key, field: insight.label, rule: "干支不存在", detail: `引用了双方排盘中不存在的干支「${match[0]}」` });
          break;
        }
      }
      // ── 2. 年份区间 ──
      for (const match of content.matchAll(YEAR_RE)) {
        if (!validYears.has(Number(match[1]))) {
          push({ section: key, field: insight.label, rule: "流年越界", detail: `${match[1]}年不在流年区间(${judgment.relation.annualRange})内` });
          break;
        }
      }
      // ── 3. 宿命/绝对化断言 ──
      for (const { pattern, label } of DUAL_FATAL_ASSERTIONS) {
        const found = pattern.exec(content);
        if (found) {
          push({ section: key, field: insight.label, rule: label, detail: `出现「${found[0]}」` });
          break;
        }
      }
      // ── 4. 禁词与感叹号 ──
      for (const word of BANNED_STYLE_WORDS) {
        if (content.includes(word)) { push({ section: key, field: insight.label, rule: "禁词", detail: `「${word}」` }); break; }
      }
      const exclaims = content.match(EXCLAIM_RE)?.length ?? 0;
      if (exclaims > 2) push({ section: key, field: insight.label, rule: "感叹号过多", detail: `${exclaims}个` });
      // ── 5. 字数 ──
      const limitLen = DUAL_FIELD_CHAR_LIMITS[insight.label] ?? (insight.label.endsWith("的底色") ? 300 : DUAL_DEFAULT_CHAR_LIMIT);
      if (content.length > limitLen) {
        push({ section: key, field: insight.label, rule: "字数超限", detail: `${content.length}字 > ${limitLen}字` });
      }
    }
  }

  // ── 6. 双方锚点一致(底色字段):旺衰档位/张冠李戴 ──
  for (const [personKey, person, otherName] of [
    ["A", judgment.persons.A, nameB],
    ["B", judgment.persons.B, nameA],
  ] as const) {
    const label = resolveDualLabel(`{${personKey}}的底色`, nameA, nameB);
    const insight = report.sections.profiles?.insights.find((item) => item.label === label);
    if (!insight) continue;
    const content = insight.content;
    if (!content.includes(`「${person.strengthLevel}」`)) {
      push({ section: "profiles", field: label, rule: "旺衰口径冲突", detail: `锚点为「${person.strengthLevel}」,文中未见原样引用` });
    }
    if (content.includes(otherName)) {
      push({ section: "profiles", field: label, rule: "张冠李戴", detail: `${label}中出现了${otherName}的姓名` });
    }
    // 喜用/忌神必须都在场(规格要求喜神忌神各一行)
    const missingFav = person.favorable.filter((el) => !content.includes(el));
    const missingCaut = person.cautious.filter((el) => !content.includes(el));
    if (missingFav.length || missingCaut.length) {
      push({ section: "profiles", field: label, rule: "喜忌缺失", detail: `喜用缺[${missingFav.join("")}] 忌神缺[${missingCaut.join("")}]` });
    }
  }

  // ── 7. 主要摩擦点:跨盘关系存在性(无跨盘关系时须写「结构平稳」) ──
  const friction = report.sections.friction?.insights.find((item) => item.label === "主要摩擦点");
  if (friction) {
    if (!judgment.relation.crossRelations.length && !friction.content.includes("结构平稳")) {
      push({ section: "friction", field: "主要摩擦点", rule: "引用不存在的关系", detail: "两盘无跨盘刑冲合害,应写「结构平稳」而非虚构摩擦" });
    }
    if (judgment.relation.crossRelations.length) {
      const citedBranch = [...friction.content].some((ch) => crossBranches.has(ch));
      if (!citedBranch) {
        push({ section: "friction", field: "主要摩擦点", rule: "缺少跨盘依据", detail: "引用的摩擦点未落到给定跨盘干支上" });
      }
    }
  }

  // ── 8. 关系关键年:3-6 个年份,均取自顺压信号清单 ──
  const rhythm = report.sections.rhythm?.insights.find((item) => item.label === "关系关键年");
  if (rhythm) {
    const years = [...rhythm.content.matchAll(YEAR_RE)].map((m) => Number(m[1]));
    const uniqueYears = [...new Set(years)];
    if (uniqueYears.length < 3 || uniqueYears.length > 6) {
      push({ section: "rhythm", field: "关系关键年", rule: "关键年数量", detail: `应挑选3-6个关键年,实际${uniqueYears.length}个` });
    }
  }

  return violations;
}

/** 违规 → 需定向重生成的章节集合(管线调度用) */
export function dualViolationsBySection(violations: DualConsistencyViolation[]): Map<DualSectionKey, string[]> {
  const grouped = new Map<DualSectionKey, string[]>();
  for (const violation of violations) {
    if (!violation.section) continue;
    const list = grouped.get(violation.section) ?? [];
    list.push(`${violation.field ? `[${violation.field}]` : ""}${violation.rule}:${violation.detail}`);
    grouped.set(violation.section, list);
  }
  return grouped;
}
