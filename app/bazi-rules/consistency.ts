// ── 跨章一致性校验(V3 生成链路 Step 4) ────────────────────────────────
// 在报告组装完成后、落库之前执行:锚点一致性(旺衰/格局/喜忌)、实体存在性(干支/
// 大运/流年)、绝对化断言扫描、字数与「」结论词、量化格式、引用证据有效性、
// 跨字段重复解释。违规按章节归并,由管线定向重生成违规章节,而非整篇重写。
// 校验规则全部由判断对象与字段规则表驱动,与 prompt 同源。

import type { StaticReading } from "../myfate-static-reading";
import { BANNED_STYLE_WORDS, DEFAULT_FIELD_CHAR_LIMIT, FIELD_CHAR_LIMITS, sectionKeys } from "../myfate-static-reading";
import type { BaziJudgment } from "./judgment";
import { FIELD_SPECS, fieldSpecsOfSection, type SectionKey } from "./field-specs";

export type ConsistencyViolation = {
  section?: SectionKey;
  field?: string;
  rule: string;
  detail: string;
};

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const GAN_ZHI_RE = new RegExp(`[${GAN}][${ZHI}]`, "g");
const YEAR_RE = /(\d{4})年/g;
const DAYUN_RE = new RegExp(`([${GAN}][${ZHI}])大运`, "g");
const QUOTED_PATTERN_RE = /「([^」]{1,8}格)」/g;

const STRENGTH_TERMS: Array<{ term: RegExp; family: "强" | "弱" | "从" | "中和" }> = [
  { term: /身强|偏强|旺身/, family: "强" },
  { term: /身弱|偏弱/, family: "弱" },
  { term: /从强|从弱|从势|专旺|弃命从势|从儿|从财|从杀|从旺/, family: "从" },
  { term: /中和/, family: "中和" },
];

const ELEMENT_CHARS = ["木", "火", "土", "金", "水"] as const;

// 绝对化断言(全报告生效;"不一定会"经负向断言排除)
const ABSOLUTE_ASSERTIONS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?<!不)(一定会|注定|必然|肯定会|绝对会|百分之百)/u, label: "绝对化措辞" },
  { pattern: /(天生注定|命运必然|无限潜力|只要努力就会成功|你是一个非常聪明的人)/u, label: "通用营销式话术" },
  { pattern: /(注定结婚|必然离婚|注定离婚|一定会?(结婚|离婚|分手)|克夫|克妻)/u, label: "婚姻宿命断言" },
  { pattern: /(一定会?(患|得)|必患|确诊|注定患病)/u, label: "疾病断言" },
  { pattern: /(一定发财|必富|暴富无疑)/u, label: "财富宿命断言" },
];

function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>();
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

export function checkConsistency(report: StaticReading, judgment: BaziJudgment): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];
  const push = (v: ConsistencyViolation) => {
    if (violations.length < 40) violations.push(v);
  };

  // ── 0. 章节与字段结构(35 字段完整、顺序正确) ──
  for (const key of sectionKeys) {
    const section = report.sections[key];
    if (!section) {
      if (key === "children" && !judgment.meta.hasHourPillar) continue; // 三柱盘子女章可选
      push({ section: key, rule: "章节缺失", detail: `${key} 章未生成` });
      continue;
    }
    const specs = fieldSpecsOfSection(key);
    const labels = section.insights.map((item) => item.label);
    const expected = specs.map((spec) => spec.id);
    if (labels.join("|") !== expected.join("|")) {
      push({ section: key, rule: "字段结构与顺序", detail: `期望[${expected.join("、")}],实际[${labels.join("、")}]` });
    }
  }

  // 事实集:四柱、大运、流年干支
  const validGanZhi = new Set<string>([
    ...judgment.facts.pillars.map((p) => p.ganzhi),
    ...judgment.facts.dayun.map((step) => step.ganzhi),
    ...judgment.facts.annual.map((year) => year.ganzhi),
  ]);
  const validYears = new Set(judgment.facts.annual.map((year) => year.year));
  const validDayun = new Set(judgment.facts.dayun.map((step) => step.ganzhi));
  const validEvidenceIds = new Set(judgment.evidence.map((item) => item.id));

  const anchorStrength = judgment.anchors.strength;
  const anchorPattern = judgment.anchors.pattern.name;
  const anchorFavorable = new Set(judgment.anchors.fuYong.favorable);
  const anchorCautious = new Set(judgment.anchors.fuYong.cautious);

  for (const key of sectionKeys) {
    const section = report.sections[key];
    if (!section) continue;
    const specs = fieldSpecsOfSection(key);
    for (const insight of section.insights) {
      const spec = specs.find((item) => item.id === insight.label);
      const content = insight.content ?? "";

      // ── 1. 实体存在性:干支对 ──
      for (const match of content.matchAll(GAN_ZHI_RE)) {
        if (!validGanZhi.has(match[0])) {
          push({ section: key, field: insight.label, rule: "干支不存在", detail: `引用了排盘中不存在的干支「${match[0]}」` });
          break;
        }
      }
      // ── 2. 流年区间 ──
      for (const match of content.matchAll(YEAR_RE)) {
        if (!validYears.has(Number(match[1]))) {
          push({ section: key, field: insight.label, rule: "流年越界", detail: `${match[1]}年不在流年排盘区间(${judgment.facts.annualRange})内` });
          break;
        }
      }
      // ── 3. 大运条目 ──
      for (const match of content.matchAll(DAYUN_RE)) {
        if (!validDayun.has(match[1])) {
          push({ section: key, field: insight.label, rule: "大运不存在", detail: `「${match[1]}大运」不在排盘大运序列中` });
          break;
        }
      }
      // ── 4. 旺衰档位家族一致 ──
      for (const { term, family } of STRENGTH_TERMS) {
        if (family === anchorStrength.family) continue;
        const found = term.exec(content);
        if (found) {
          push({ section: key, field: insight.label, rule: "旺衰口径冲突", detail: `锚点为「${anchorStrength.level}」(${anchorStrength.family}族),文中出现「${found[0]}」` });
          break;
        }
      }
      // ── 5. 格局名一致(「」内标签严格校验) ──
      for (const match of content.matchAll(QUOTED_PATTERN_RE)) {
        if (match[1] !== anchorPattern) {
          push({ section: key, field: insight.label, rule: "格局名冲突", detail: `「${match[1]}」与引擎判定「${anchorPattern}」不一致` });
          break;
        }
      }
      // ── 6. 喜忌五行集合一致 ──
      if (insight.label === "喜神") {
        const found = ELEMENT_CHARS.filter((el) => content.includes(el));
        if (found.length !== anchorFavorable.size || !found.every((el) => anchorFavorable.has(el))) {
          push({ section: key, field: insight.label, rule: "喜神不一致", detail: `文中五行[${found.join("")}],锚点[${[...anchorFavorable].join("")}]` });
        }
      }
      if (insight.label === "忌神") {
        const found = ELEMENT_CHARS.filter((el) => content.includes(el));
        if (found.length !== anchorCautious.size || !found.every((el) => anchorCautious.has(el))) {
          push({ section: key, field: insight.label, rule: "忌神不一致", detail: `文中五行[${found.join("")}],锚点[${[...anchorCautious].join("")}]` });
        }
      }
      // ── 7. 绝对化断言(量化格式字段先剥离其标准格式再查) ──
      let scanContent = content;
      if (spec?.validation.quantifiedFormat === "wealth-tier") scanContent = scanContent.replace(/^以下为纯天赋计算值[^。]*。/u, "");
      if (spec?.validation.quantifiedFormat === "love-probability") scanContent = scanContent.replace(/缘分概率\d{1,3}%/g, "");
      if (spec?.validation.quantifiedFormat === "gender-lean") scanContent = scanContent.replace(/准确率约60-70%,?仅供参考/g, "");
      for (const { pattern, label } of ABSOLUTE_ASSERTIONS) {
        const found = pattern.exec(scanContent);
        if (found) {
          push({ section: key, field: insight.label, rule: label, detail: `出现「${found[0]}」` });
          break;
        }
      }
      // ── 8. 禁词 ──
      for (const word of BANNED_STYLE_WORDS) {
        if (content.includes(word)) { push({ section: key, field: insight.label, rule: "禁词", detail: `「${word}」` }); break; }
      }
      // ── 9. 字数 ──
      const limitLen = FIELD_CHAR_LIMITS[insight.label] ?? DEFAULT_FIELD_CHAR_LIMIT;
      if (content.length > limitLen) {
        push({ section: key, field: insight.label, rule: "字数超限", detail: `${content.length}字 > ${limitLen}字` });
      }
      // ── 10. 「」结论词 ──
      if (spec?.validation.requireQuoteMark && !content.includes("「")) {
        push({ section: key, field: insight.label, rule: "缺少「」结论词", detail: "该字段必须含至少一处「」括注的核心结论" });
      }
      // ── 11. 必引干支 ──
      if (spec?.validation.mustCiteGanzhi && !GAN_ZHI_RE.test(content)) {
        push({ section: key, field: insight.label, rule: "缺少干支依据", detail: "该字段必须引用具体干支" });
      }
      GAN_ZHI_RE.lastIndex = 0;
      // ── 12. 量化格式 ──
      if (spec?.validation.quantifiedFormat === "wealth-tier") {
        const range = judgment.anchors.wealthTier.range;
        if (!content.includes(range)) push({ section: key, field: insight.label, rule: "财富档区间不一致", detail: `必须原样包含引擎区间「${range}」` });
        if (!content.startsWith("以下为纯天赋计算值")) push({ section: key, field: insight.label, rule: "财富免责首行缺失", detail: "首行必须原样输出免责声明" });
      }
      if (spec?.validation.quantifiedFormat === "gender-lean" && !content.includes("准确率约60-70%")) {
        push({ section: key, field: insight.label, rule: "性别倾向缺标注", detail: "句末必须带(准确率约60-70%,仅供参考)" });
      }
      if (spec?.validation.quantifiedFormat === "love-probability") {
        const probs = [...content.matchAll(/缘分概率(\d{1,3})%/g)].map((m) => Number(m[1]));
        const bad = probs.some((p) => p < 20 || p > 90);
        if (!probs.length || bad) push({ section: key, field: insight.label, rule: "缘分概率格式", detail: "每年须有20-90%的缘分概率" });
      }
      if (spec?.validation.quantifiedFormat === "score-per-item") {
        const scores = (content.match(/\d{2}分/g) ?? []).length;
        if (scores < 5) push({ section: key, field: insight.label, rule: "逐项评分缺失", detail: `大运/流年条目须逐项打分(检出${scores}处)` });
      }
      // ── 13. 引用证据有效 ──
      for (const id of insight.evidenceIds ?? []) {
        if (!validEvidenceIds.has(id)) {
          push({ section: key, field: insight.label, rule: "引用证据无效", detail: `evidenceId「${id}」不在判断对象中` });
          break;
        }
      }
    }
  }

  // ── 14. 跨字段重复解释(排除时间线字段的固有结构相似) ──
  const timelineLabels = new Set(["一生事业轨迹", "近期流年事业", "一生财富大运", "近期财富流年", "一生婚恋大运", "近期感情流年"]);
  const allInsights = sectionKeys.flatMap((key) =>
    (report.sections[key]?.insights ?? []).map((insight) => ({ ...insight, section: key })));
  let repeated = 0;
  for (let i = 0; i < allInsights.length && repeated < 3; i += 1) {
    for (let j = i + 1; j < allInsights.length && repeated < 3; j += 1) {
      const a = allInsights[i];
      const b = allInsights[j];
      if (timelineLabels.has(a.label) || timelineLabels.has(b.label)) continue;
      const score = similarity(a.content, b.content);
      if (score > 0.65) {
        push({ section: b.section, field: b.label, rule: "跨字段重复", detail: `与「${a.label}」相似度${Math.round(score * 100)}%` });
        repeated += 1;
      }
    }
  }

  // ── 15. disclaimer ──
  if (!report.disclaimer || report.disclaimer.length < 20) {
    push({ rule: "免责声明", detail: "disclaimer 缺失或过短" });
  }

  return violations;
}

/** 违规 → 需定向重生成的章节集合(带违规摘要,供重试 prompt) */
export function violationsBySection(violations: ConsistencyViolation[]): Map<SectionKey, string[]> {
  const grouped = new Map<SectionKey, string[]>();
  for (const violation of violations) {
    if (!violation.section) continue;
    const list = grouped.get(violation.section) ?? [];
    list.push(`${violation.field ? `[${violation.field}]` : ""}${violation.rule}:${violation.detail}`);
    grouped.set(violation.section, list);
  }
  return grouped;
}

/** 全部字段 spec(供管线引用) */
export const ALL_FIELD_SPECS = FIELD_SPECS;
