// 明星单人报告统一到「个人解读」体系(single-static 两阶段:论证计划 → 八章静态命局):
// 排盘取事实 → 计划校验 → 八章生成(13 类拦截) → upsert consult_overrides(纯 staticReadingSchema 结构)。
// 报告页按 staticReadingSchema 识别渲染;旧 ConsultOverrideContent 过渡期保留,--force 覆盖。
// 用法: npx tsx --env-file=.env.local scripts/gen-star-static.ts --star=suga [--dry] [--force]
//       npx tsx --env-file=.env.local scripts/gen-star-static.ts --all [--force]  # 批量
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { generateChatText } from "../app/api/myfate/personalize/model-provider";
import { buildStaticReadingFacts, generateStaticReading, staticReadingSchema } from "../app/myfate-static-reading";
import { getPublishedStarBirths } from "../app/myfate-stars-server";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const starArg = args.find((a) => a.startsWith("--star="))?.slice(7);
const all = args.includes("--all");
if (!starArg && !all) throw new Error("用法: gen-star-static.ts --star=<id> | --all [--dry] [--force]");
if (!process.env.DEEPSEEK_API_KEY) throw new Error("缺少 DEEPSEEK_API_KEY");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("缺少 SUPABASE_URL / SUPABASE_SECRET_KEY");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function hasStaticOverride(starId: string): Promise<boolean> {
  const { data } = await supabase.from("consult_overrides").select("content").eq("star_id", starId).maybeSingle();
  const content = (data as { content?: unknown } | null)?.content;
  return Boolean(content && staticReadingSchema.safeParse(content).success);
}

async function generate(row: Awaited<ReturnType<typeof getPublishedStarBirths>>[number]) {
  const chart = buildBaziChart({
    birthDate: row.birthDate,
    birthTime: row.birthTime,
    gender: row.gender === "female" ? "female" : "male",
    city: { id: row.id, name: row.birthPlace ?? "首尔 · 韩国", lat: row.lat ?? 37.5665, lon: row.lon ?? 126.978, tz: row.tz ?? "Asia/Seoul" },
  });
  const profile = buildBaziLifeProfile(chart);
  const facts = buildStaticReadingFacts(chart, profile);
  const report = await generateStaticReading(
    async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { temperature: 0.35, maxTokens: 10000, json: true })).content,
    facts,
  );
  return report;
}

const rows = await getPublishedStarBirths();
const targets = starArg ? rows.filter((row) => row.id === starArg) : rows;
if (starArg && !targets.length) throw new Error(`找不到出生资料完整的已发布明星: ${starArg}`);

let done = 0;
let failed = 0;
for (const row of targets) {
  if (!force && await hasStaticOverride(row.id)) {
    console.log(`= ${row.name}(${row.id}) 已有 static 报告,跳过`);
    continue;
  }
  const startedAt = Date.now();
  try {
    const report = await generate(row);
    if (!dry) {
      const { error } = await supabase
        .from("consult_overrides")
        .upsert({ star_id: row.id, content: report, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
      if (error) throw error;
    }
    done += 1;
    console.log(`${dry ? "[dry] " : ""}✓ ${row.name}(${row.id}) 八章生成完成 ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${row.name}(${row.id}) 失败:`, error instanceof Error ? error.message.slice(0, 160) : error);
  }
}
console.log(`完成 ${done},失败 ${failed},共 ${targets.length}`);
