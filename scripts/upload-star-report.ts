// 明星生辰报告上传:读取按 docs/star-report-upload.md 规范填写的 JSON,
// 校验(结构/枚举/大运干支/highlights 子串/流年区间)→ 排盘补四柱与大运年份/当前步 → 入库。
// 用法:npx tsx --env-file=.env.local scripts/upload-star-report.ts 报告.json [--dry]
/* eslint-disable @typescript-eslint/no-explicit-any -- 校验外部提交的松散 JSON,逐字段判错 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const file = args.find((a) => !a.startsWith("--"));
if (!file) throw new Error("用法: upload-star-report.ts 报告.json [--dry]");

const input = JSON.parse(readFileSync(file, "utf8")) as {
  meta: {
    id: string; name: string; nameEn?: string; role?: string; gender: "male" | "female";
    birthDate: string; birthTime: string; birthPlace?: string;
    lat: number; lon: number; tz: string;
    tagline?: string; description?: string; mbti?: string;
    ideal?: Record<string, number>; portraitUrl?: string;
    createProfile?: boolean; publish?: boolean;
  };
  heroBadges: string[];
  facts?: {
    education?: string | null;
    career?: { debutYear?: number | null; group?: string; roles?: string[]; tier?: string; achievements?: string[] };
    timeline?: Array<{ year: number; event: string }>;
    futureKnown?: Array<{ year: number; event: string }>;
    relationship?: string;
    notes?: string;
  };
  report: Record<string, unknown>;
};

const errors: string[] = [];
const warn: string[] = [];
const meta = input.meta;
const report = input.report as any;
const currentYear = new Date().getFullYear();

// ── meta 基础校验 ──
for (const key of ["id", "name", "birthDate", "birthTime", "lat", "lon", "tz", "gender"] as const) {
  if (meta[key] === undefined || meta[key] === null || meta[key] === "") errors.push(`meta.${key} 缺失`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.birthDate ?? "")) errors.push("meta.birthDate 须为 YYYY-MM-DD");
if (!/^\d{2}:\d{2}$/.test(meta.birthTime ?? "")) errors.push("meta.birthTime 须为 HH:MM");
if (!Array.isArray(input.heroBadges) || input.heroBadges.length !== 3) errors.push("heroBadges 必须为 3 枚标签");

// ── 排盘 ──
const chart = /^\d{4}-\d{2}-\d{2}$/.test(meta.birthDate ?? "") && /^\d{2}:\d{2}$/.test(meta.birthTime ?? "")
  ? buildBaziChart({
      birthDate: meta.birthDate, birthTime: meta.birthTime,
      gender: meta.gender === "female" ? "female" : "male",
      city: { id: meta.id, name: meta.birthPlace ?? "首尔", lat: meta.lat, lon: meta.lon, tz: meta.tz },
    })
  : null;
if (chart) {
  console.log(`排盘: ${chart.pillars.map((p) => p.ganzhi).join(" ")} | 日主 ${chart.dayMaster}`);
  for (const s of chart.daYun.steps) console.log(`  大运 ${s.ganzhi} ${s.startAge}-${s.endAge}岁 (${s.startYear}-${s.endYear})${s.current ? " ← 当前" : ""}`);

  // ── 标签与排盘交叉校验 ──
  if (Array.isArray(input.heroBadges) && input.heroBadges.length === 3) {
    const summary = buildBaziLifeProfile(chart).summary;
    const engineDayMaster = `${chart.dayMaster}${summary.dayElement}日主`;
    if (input.heroBadges[0] !== engineDayMaster) errors.push(`heroBadges[0]「${input.heroBadges[0]}」与排盘不符,应为「${engineDayMaster}」(日主是排盘事实)`);
    if (input.heroBadges[1] !== summary.strength) warn.push(`heroBadges[1]「${input.heroBadges[1]}」与引擎旺衰「${summary.strength}」不同(学派口径差异,请确认)`);
    const aiSet = (input.heroBadges[2] ?? "").replace("喜用", "").split("·").map((s: string) => s.trim()).filter(Boolean).sort().join("、");
    const engineSet = [...summary.favorable].sort().join("、");
    if (aiSet !== engineSet) warn.push(`heroBadges[2]「${input.heroBadges[2]}」与引擎喜用「喜用 ${engineSet}」不同(请确认是有意为之)`);
  }
}

// ── 六章节 ──
for (const key of ["portrait", "pattern", "education", "career", "wealth", "love"]) {
  if (!report[key] || typeof report[key] !== "object") errors.push(`report.${key} 章节缺失`);
}

// ── 通用校验器 ──
const TREND = ["承压 ↓", "向好 ↑", "强劲 ↑↑", "平稳 →"];
const TAG = ["婚恋窗口", "动荡期", "平稳期"];
function checkRich(path: string, node: { content: string; highlights: string[] } | undefined) {
  if (!node?.content || typeof node.content !== "string") { errors.push(`${path}.content 缺失`); return; }
  if (!Array.isArray(node.highlights) || node.highlights.length === 0) { errors.push(`${path}.highlights 至少 1 个`); return; }
  if (node.highlights.length > 3) errors.push(`${path}.highlights 最多 3 个`);
  for (const hl of node.highlights) if (!node.content.includes(hl)) errors.push(`${path}.highlights 的「${hl}」不是 content 的逐字子串`);
}

if (report.portrait) {
  checkRich("portrait.strength", report.portrait.strength);
  checkRich("portrait.dao", report.portrait.dao);
  if (report.portrait.neutral) checkRich("portrait.neutral", { ...report.portrait.neutral, highlights: report.portrait.neutral.highlights ?? [""] });
  if (!Array.isArray(report.portrait.shenSha) || !report.portrait.shenSha.length) errors.push("portrait.shenSha 至少 1 条");
  if (!Array.isArray(report.portrait.temperament) || report.portrait.temperament.length < 2) errors.push("portrait.temperament 至少 2 段");
  report.portrait.temperament?.forEach((t: unknown, i: number) => checkRich(`portrait.temperament[${i}]`, t as never));
}
if (report.pattern) {
  checkRich("pattern.monthGridRich", report.pattern.monthGridRich);
  if (!Array.isArray(report.pattern.structures) || report.pattern.structures.length < 2) errors.push("pattern.structures 至少 2 条");
}
if (report.education) {
  if (!report.education.degree) errors.push("education.degree 缺失");
  if (!Array.isArray(report.education.majors) || !report.education.majors.length) errors.push("education.majors 至少 1 个");
  for (const k of ["examGood", "examBad"] as const) if (!Array.isArray(report.education[k])) errors.push(`education.${k} 须为数组`);
}

// ── 大运三表 + 流年三表 ──
const ENGINE_STEPS = new Map((chart?.daYun.steps ?? []).map((s) => [s.ganzhi, s]));
function checkLifetime(path: string, steps: any[] | undefined, kind: "career" | "wealth" | "love") {
  if (!Array.isArray(steps) || steps.length < 6) { errors.push(`${path} 至少 6 步大运`); return; }
  if (steps.length > 10) errors.push(`${path} 最多 10 步`);
  for (const [i, step] of steps.entries()) {
    if (!ENGINE_STEPS.has(step.ganzhi)) errors.push(`${path}[${i}] 大运干支「${step.ganzhi}」与排盘不符`);
    if (typeof step.age !== "string" || !step.age) errors.push(`${path}[${i}].age 缺失`);
    if (typeof step.note !== "string" || step.note.length < 4) errors.push(`${path}[${i}].note 缺失或过短`);
    else if (step.note.length < 12) warn.push(`${path}[${i}].note 偏短(${step.note.length} 字),建议 20 字以上`);
    if (kind === "career" && (typeof step.score !== "number" || step.score < 0 || step.score > 100)) errors.push(`${path}[${i}].score 须为 0-100`);
    if (kind === "wealth" && !TREND.includes(step.trend)) errors.push(`${path}[${i}].trend「${step.trend}」不在枚举内`);
    if (kind === "love" && !TAG.includes(step.tag)) errors.push(`${path}[${i}].tag「${step.tag}」不在枚举内`);
  }
  const seen = new Set(steps.map((s) => s.ganzhi));
  if (seen.size !== steps.length) errors.push(`${path} 存在重复大运干支`);
}
function checkYears(path: string, years: any[] | undefined, kind: "career" | "wealth" | "love") {
  if (!Array.isArray(years) || years.length !== 11) { errors.push(`${path} 须为连续 11 年`); return; }
  const list = [...years].sort((a, b) => a.year - b.year);
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].year !== list[0].year + i) { errors.push(`${path} 年份须连续(${list[0].year}-${list[0].year + 10})`); break; }
  }
  if (list[0].year !== currentYear - 5) warn.push(`${path} 窗口为 ${list[0].year}-${list[0].year + 10}(默认当前年±5,不一致请确认是有意为之)`);
  for (const [i, y] of years.entries()) {
    if (kind !== "love" && (typeof y.score !== "number" || y.score < 0 || y.score > 100)) errors.push(`${path}[${i}].score 须为 0-100`);
    if (kind === "love" && (typeof y.prob !== "number" || y.prob < 0 || y.prob > 100)) errors.push(`${path}[${i}].prob 须为 0-100`);
    if (kind === "love" && typeof y.warn !== "boolean") errors.push(`${path}[${i}].warn 须为布尔值`);
    const text = (kind === "career" ? y.action : y.note) ?? "";
    if (typeof text !== "string" || text.length < 8) errors.push(`${path}[${i}] 文案过短`);
  }
}
if (report.career) {
  for (const k of ["direction", "management", "guiren", "xiaoren", "boss"] as const) if (!report.career[k]) errors.push(`career.${k} 缺失`);
  checkLifetime("career.lifetime", report.career.lifetime, "career");
  checkYears("career.years", report.career.years, "career");
}
if (report.wealth) {
  checkRich("wealth.rangeRich", report.wealth.rangeRich);
  if (typeof report.wealth.source !== "string" || !report.wealth.source) errors.push("wealth.source 缺失");
  else if (report.wealth.source.endsWith("。")) errors.push("wealth.source 结尾不能是句号(页面会自动补)");
  checkLifetime("wealth.lifetime", report.wealth.lifetime, "wealth");
  checkYears("wealth.years", report.wealth.years, "wealth");
}
if (report.love) {
  if (!Array.isArray(report.love.spouse) || report.love.spouse.length < 3) errors.push("love.spouse 至少 3 条");
  for (const k of ["family", "stability"] as const) if (!report.love[k]) errors.push(`love.${k} 缺失`);
  checkLifetime("love.lifetime", report.love.lifetime, "love");
  checkYears("love.years", report.love.years, "love");
}

// ── 反常识归因标记(counter:true 为生成方暗标记,不渲染;上传时点名警告并剥离) ──
const counterMarked: string[] = [];
function stripCounter(node: unknown, path: string): unknown {
  if (Array.isArray(node)) return node.map((item, i) => stripCounter(item, `${path}[${i}]`));
  if (node && typeof node === "object") {
    const { counter, ...rest } = node as Record<string, unknown>;
    if (counter === true) counterMarked.push(path);
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripCounter(v, `${path}.${k}`)]));
  }
  return node;
}
const cleanedReport = stripCounter(report, "report");

// ── 结果 ──
// AI 自搜的现实资料包:打印供人工复核(不入库)
if (input.facts && Object.keys(input.facts).length) {
  const f = input.facts;
  console.log("\n──── AI 搜到的现实资料(请复核,不入库)────");
  console.log(`  学历: ${f.education ?? "(未提供)"}`);
  if (f.career) console.log(`  职业: ${f.career.group ?? "?"} · ${f.career.debutYear ?? "?"} 出道 · 定位 ${(f.career.roles ?? []).join("/")} · 档位 ${f.career.tier ?? "未取档"}`);
  for (const t of f.timeline ?? []) console.log(`  大事 ${t.year}: ${t.event}${t.year < 1990 || t.year > 2035 ? `  ⚠ 年份存疑` : ""}`);
  for (const t of f.futureKnown ?? []) console.log(`  已知日程 ${t.year}: ${t.event}`);
  console.log(`  婚恋: ${f.relationship ?? "(未提供)"}`);
  if (f.notes) console.log(`  备注: ${f.notes}`);
  const tier = f.career?.tier;
  if (!tier) warn.push("facts.career.tier 未取档,财富区间将依赖 AI 判断,建议人工核实");
  else if (!["顶流", "一线", "二线", "新人上升期"].includes(tier)) errors.push(`facts.career.tier「${tier}」不在四档枚举内(顶流/一线/二线/新人上升期)`);
}
if (errors.length) {
  console.error(`\n✖ 校验失败 ${errors.length} 项:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (!chart) throw new Error("排盘不可用(出生资料未通过校验)");
for (const w of warn) console.warn(`  ⚠ ${w}`);
if (counterMarked.length) {
  console.warn(`  ⚠ 反常识归因条目 ${counterMarked.length} 处(盘面与事实方向相反的段落,请人工重点复核):`);
  for (const p of counterMarked) console.warn(`    · ${p}`);
}
console.log(`✓ 校验通过${dry ? "(--dry,不入库)" : ""}`);
if (dry) process.exit(0);

// ── 补算大运年份与当前步 ──
const enriched = JSON.parse(JSON.stringify(cleanedReport));
for (const section of ["career", "wealth", "love"] as const) {
  for (const step of enriched[section].lifetime) {
    const engine = ENGINE_STEPS.get(step.ganzhi);
    if (!engine) continue; // 校验阶段已保证干支合法,此处兜底
    step.years = `${engine.startYear}-${engine.endYear}`;
    step.current = engine.current;
  }
}

const content = {
  heroPillars: chart.pillars.map((p) => p.ganzhi),
  heroBadges: input.heroBadges,
  ...enriched,
};

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

if (meta.createProfile) {
  const { error } = await supabase.from("celebrity_profiles").upsert({
    id: meta.id, name: meta.name, name_en: meta.nameEn ?? meta.name, name_zh: meta.name,
    role: meta.role ?? meta.name, tagline: meta.tagline ?? "", description: meta.description ?? "",
    relationship_style: "", focus: "", mbti: meta.mbti ?? "",
    birth_date: meta.birthDate, birth_time: meta.birthTime, birth_place: meta.birthPlace ?? "",
    birth_lat: meta.lat, birth_lon: meta.lon, birth_tz: meta.tz, gender: meta.gender,
    three_pillars: chart.pillars.slice(0, 3).map((p) => p.ganzhi).join(" · "),
    traits: [], categories: [], ideal: meta.ideal ?? { security: 50, expression: 50, independence: 50, conflict: 50, novelty: 50 },
    portrait_url: meta.portraitUrl ?? "", published: Boolean(meta.publish),
    enable_bazi: true, enable_mbti: true, match_count: 0,
  }, { onConflict: "id" });
  if (error) throw new Error(`建档失败: ${error.message}`);
  console.log(`✓ 建档 ${meta.id}(published=${Boolean(meta.publish)})`);
}

const { error: upsertError } = await supabase.from("consult_overrides")
  .upsert({ star_id: meta.id, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
if (upsertError) throw new Error(`内容上传失败: ${upsertError.message}`);
console.log(`✓ ${meta.name}(${meta.id}) 报告已上传,即时生效`);
console.log(`  四柱: ${content.heroPillars.join(" ")} | 标签: ${content.heroBadges.join(" / ")}`);
