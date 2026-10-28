// 明星报告批量重生成:全部 published 明星按当前个人报告同款蒸馏模版(九章35字段)生成。
// 排盘只用年/月/日三柱——出生时间不公开,时柱留空(正午排盘仅为定日柱与大运,随后丢弃时柱
// 并按三柱重算五行计数);生成结果连同 heroPillars(三柱)/heroBadges 写入 consult_overrides,
// 报告页即时生效。可断点续跑:已生成到输出目录的明星自动跳过。
// 用法: npx -y tsx --env-file=.env.local scripts/generate-star-reports.ts [--only=id1,id2] [--dry]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart, GAN_WUXING, ZHI_WUXING } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import {
  buildStaticReadingFacts,
  generateStaticReading,
  STATIC_READING_STAR_SYSTEM_PROMPT,
  STAR_REPORT_PROMPT_SUFFIX,
} from "../app/myfate-static-reading";
import { generateChatText } from "../app/api/myfate/personalize/model-provider";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",").filter(Boolean)) : null;
const OUT_DIR = process.env.OUT_DIR ?? "/tmp/star-reports-v3";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const { data: stars, error } = await db.from("celebrity_profiles")
  .select("id,name,birth_date,gender,birth_place,birth_lat,birth_lon,birth_tz")
  .eq("published", true)
  .order("created_at");
if (error || !stars?.length) throw error ?? new Error("no published stars");

const provider = process.env.GEMINI_API_KEY ? "gemini" : "deepseek";
const maxTokens = provider === "gemini" ? 30000 : 8192;
mkdirSync(OUT_DIR, { recursive: true });
const targets = stars.filter((star) => !only || only.has(star.id));
console.log(`目标 ${targets.length}/${stars.length} 位明星 | 模型:${provider} | 输出:${OUT_DIR}${dry ? " | --dry 不入库" : ""}`);

let done = 0;
let failed = 0;
for (const star of targets) {
  const outPath = `${OUT_DIR}/${star.id}.json`;
  if (existsSync(outPath)) {
    done += 1;
    console.log(`= ${star.id} 已生成,跳过`);
    continue;
  }
  const t0 = Date.now();
  try {
    const full = buildBaziChart({
      birthDate: star.birth_date,
      birthTime: "12:00",
      gender: star.gender === "female" ? "female" : "male",
      city: {
        id: star.id,
        name: star.birth_place || "首尔 · 韩国",
        lat: star.birth_lat ?? 37.5665,
        lon: star.birth_lon ?? 126.978,
        tz: star.birth_tz ?? "Asia/Seoul",
      },
    });
    const pillars = full.pillars.slice(0, 3);
    const wuXing: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const pillar of pillars) {
      wuXing[GAN_WUXING[pillar.ganzhi[0]]] += 1;
      wuXing[ZHI_WUXING[pillar.ganzhi[1]]] += 1;
    }
    const chart = { ...full, pillars, wuXing };
    const profile = buildBaziLifeProfile(chart);
    const facts = buildStaticReadingFacts(chart, profile);
    const report = await generateStaticReading(
      async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider, temperature: 0.35, maxTokens, json: true })).content,
      facts,
      profile,
      { systemPrompt: STATIC_READING_STAR_SYSTEM_PROMPT, promptSuffix: STAR_REPORT_PROMPT_SUFFIX },
    );
    const content = {
      ...report,
      heroPillars: pillars.map((pillar) => pillar.ganzhi),
      heroBadges: [
        `${chart.dayMaster}${profile.summary.dayElement}日主`,
        profile.summary.strength,
        `喜用 ${profile.summary.favorable.join(" · ")}`,
      ],
    };
    writeFileSync(outPath, JSON.stringify(content, null, 1));
    if (!dry) {
      const { error: upsertError } = await db.from("consult_overrides")
        .upsert({ star_id: star.id, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
      if (upsertError) throw new Error(upsertError.message);
    }
    done += 1;
    console.log(`✓ ${star.id} ${star.name} ${pillars.map((p) => p.ganzhi).join(" ")} (${((Date.now() - t0) / 1000).toFixed(0)}s) [${done}/${targets.length}]`);
  } catch (e) {
    failed += 1;
    console.error(`✖ ${star.id} ${star.name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`完成: ${done} 成功 / ${failed} 失败${dry ? "(--dry 未入库)" : ""}`);
