// 从 app/bazi-rules/field-specs.ts 生成九章35字段规则表文档(交付物 B)。
// 运行:npx esbuild scripts/gen-field-rules-doc.mjs --bundle --platform=node --format=esm --outfile=.cache/gen-field-rules-doc.mjs && node .cache/gen-field-rules-doc.mjs
import { writeFileSync } from "node:fs";
import { FIELD_SPECS, FIELD_COUNT, SECTION_TITLES } from "../app/bazi-rules/field-specs";

const SECTION_ORDER = ["portrait", "pattern", "education", "career", "wealth", "relationship", "wellbeing", "children", "family"];
const SECTION_NO = {
  portrait: "01", pattern: "02", education: "03", career: "04",
  wealth: "05", relationship: "06", wellbeing: "07", children: "08", family: "09",
};

const lines = [];
lines.push("# 九章 35 字段生成规则表(交付物 B)", "");
lines.push("> 来源:`app/bazi-rules/field-specs.ts`(机器可读版,prompt 与 consistency.ts 校验共用同一份——规则与校验永远同源)。");
lines.push("> 字段 ID/顺序/数量与现有九章 35 字段模板完全一致,不增不减不改序。", "");
lines.push("| 章 | 字段 | 字数上限 | 必引证据 | 「」结论 | 量化格式 | 依赖 |", "|---|---|---|---|---|---|---|");
for (const key of SECTION_ORDER) {
  for (const spec of FIELD_SPECS.filter((s) => s.section === key).sort((a, b) => a.order - b.order)) {
    lines.push(`| ${SECTION_NO[key]} ${SECTION_TITLES[key]} | ${spec.id} | ${spec.lengthLimit} | ${spec.evidence.join(" / ") || "—"} | ${spec.validation.requireQuoteMark ? "✓" : "—"} | ${spec.validation.quantifiedFormat ?? "—"} | ${spec.dependencies.join("、") || "—"} |`);
  }
}
lines.push("", `共 **${FIELD_COUNT}** 字段。`, "");

for (const key of SECTION_ORDER) {
  lines.push(`## ${SECTION_NO[key]} ${SECTION_TITLES[key]}(${FIELD_SPECS.filter((s) => s.section === key).length} 字段)`, "");
  for (const spec of FIELD_SPECS.filter((s) => s.section === key).sort((a, b) => a.order - b.order)) {
    lines.push(`### ${spec.id}`, "");
    lines.push(`- **职责**:${spec.title}`);
    lines.push(`- **输入数据**:${spec.inputData.join("、")}`);
    lines.push(`- **触发条件**:${spec.triggerConditions}`);
    lines.push(`- **命理推导规则**:`);
    for (const rule of spec.interpretationRules) lines.push(`  - ${rule}`);
    lines.push(`- **必引证据**:${spec.evidence.join(" / ") || "不强制"}`);
    lines.push(`- **写作结构**:${spec.writingStructure}`);
    lines.push(`- **字数上限**:${spec.lengthLimit} 字`);
    lines.push(`- **语气**:${spec.tone}`);
    lines.push(`- **禁止**:${spec.prohibited.join(";")}`);
    lines.push(`- **依赖字段**:${spec.dependencies.join("、") || "无"}`);
    const validation = [
      spec.validation.requireQuoteMark ? "必须含「」结论词" : "",
      spec.validation.mustCiteGanzhi ? "必须引用具体干支" : "",
      spec.validation.quantifiedFormat ? `量化格式:${spec.validation.quantifiedFormat}` : "",
    ].filter(Boolean);
    lines.push(`- **机器校验**:${validation.join(";") || "常规(禁词/字数/干支存在性)"}`, "");
  }
}

writeFileSync("docs/report-v3-field-rules.md", lines.join("\n"));
console.log(`docs/report-v3-field-rules.md 已生成,共 ${FIELD_COUNT} 字段`);
