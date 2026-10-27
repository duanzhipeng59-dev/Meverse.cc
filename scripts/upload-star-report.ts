// 明星生辰报告上传:读取按 docs/star-report-upload.md 规范手写的 v3 九章 JSON,
// 校验(staticReadingSchema + heroBadges 排盘交叉校验)→ 排盘补 heroPillars → 入库。
// 用法:npx tsx --env-file=.env.local scripts/upload-star-report.ts 报告.json [--dry]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { staticReadingSchema } from "../app/myfate-static-reading";

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
  report: Record<string, unknown> & { heroBadges?: string[] };
};

const errors: string[] = [];
const warn: string[] = [];
const meta = input.meta;
const report = input.report;

// ── meta 基础校验 ──
for (const key of ["id", "name", "birthDate", "birthTime", "lat", "lon", "tz", "gender"] as const) {
  if (meta[key] === undefined || meta[key] === null || meta[key] === "") errors.push(`meta.${key} 缺失`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.birthDate ?? "")) errors.push("meta.birthDate 须为 YYYY-MM-DD");
if (!/^\d{2}:\d{2}$/.test(meta.birthTime ?? "")) errors.push("meta.birthTime 须为 HH:MM");

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
}

// ── 报告结构校验:手写 single-full-v3 九章(staticReadingSchema,strict;heroBadges 是附加键,先剥离) ──
const { heroBadges: providedBadges, ...reportCore } = report;
let heroBadges = providedBadges as string[] | undefined;
const parsed = staticReadingSchema.safeParse(reportCore);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    errors.push(`report.${issue.path.join(".")}: ${issue.message}`);
  }
} else {
  const sections = Object.entries(parsed.data.sections) as Array<[string, { title: string; summary: string; insights: unknown[]; advice: string[] }]>;
  for (const [key, section] of sections) {
    if (!section.insights.length) errors.push(`report.sections.${key}.insights 至少 1 条`);
    if (section.summary.length < 20) warn.push(`report.sections.${key}.summary 偏短(${section.summary.length} 字),建议 60 字以上`);
    for (const [i, insight] of section.insights.entries()) {
      const content = (insight as { content?: string }).content ?? "";
      if (content.length < 30) warn.push(`report.sections.${key}.insights[${i}].content 偏短(${content.length} 字)`);
    }
  }
  if (parsed.data.schemaVersion !== "single-full-v3") warn.push(`schemaVersion 为「${parsed.data.schemaVersion}」,统一口径建议 single-full-v3`);
}

// ── heroBadges 与排盘交叉校验(未提供则按引擎推算) ──
if (chart && Array.isArray(heroBadges)) {
  if (heroBadges.length !== 3) {
    warn.push(`heroBadges 为 ${heroBadges.length} 枚,规范为 3 枚(日主/旺衰/喜用)`);
  } else {
    const summary = buildBaziLifeProfile(chart).summary;
    const engineDayMaster = `${chart.dayMaster}${summary.dayElement}日主`;
    if (heroBadges[0] !== engineDayMaster) errors.push(`heroBadges[0]「${heroBadges[0]}」与排盘不符,应为「${engineDayMaster}」(日主是排盘事实)`);
    if (heroBadges[1] !== summary.strength) warn.push(`heroBadges[1]「${heroBadges[1]}」与引擎旺衰「${summary.strength}」不同(学派口径差异,请确认)`);
    const given = (heroBadges[2] ?? "").replace("喜用", "").split("·").map((s: string) => s.trim()).filter(Boolean).sort().join("、");
    const engineSet = [...summary.favorable].sort().join("、");
    if (given !== engineSet) warn.push(`heroBadges[2]「${heroBadges[2]}」与引擎喜用「喜用 ${engineSet}」不同(请确认是有意为之)`);
  }
}
if (!heroBadges && chart) {
  const summary = buildBaziLifeProfile(chart).summary;
  heroBadges = [`${chart.dayMaster}${summary.dayElement}日主`, summary.strength, `喜用 ${summary.favorable.join(" · ")}`];
  console.log(`heroBadges 未提供,按引擎推算: ${heroBadges.join(" / ")}`);
}

// ── 结果 ──
if (errors.length) {
  console.error(`\n✖ 校验失败 ${errors.length} 项:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (!chart) throw new Error("排盘不可用(出生资料未通过校验)");
if (!parsed.success) throw new Error("报告结构校验未通过");
for (const w of warn) console.warn(`  ⚠ ${w}`);
console.log(`✓ 校验通过${dry ? "(--dry,不入库)" : ""}`);
if (dry) process.exit(0);

// ── 组装入库内容:九章报告 + 排盘补四柱/标签 ──
const content = {
  ...parsed.data,
  heroPillars: chart.pillars.map((p) => p.ganzhi),
  heroBadges: heroBadges ?? [],
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
