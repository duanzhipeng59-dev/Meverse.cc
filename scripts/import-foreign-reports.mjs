// 将 scripts/foreign-reports/*.json(人工撰写的 v3 结构报告)导入 consult_overrides。
// 运行:npx esbuild scripts/import-foreign-reports.mjs --bundle --platform=node --format=esm --outfile=.cache/import-reports.mjs && node .cache/import-reports.mjs
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { staticReadingSchema } from "../app/myfate-static-reading";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const BIRTH = {
  "taylor-swift": ["1989-12-13", "female", "雷丁", 40.335, -75.927, "America/New_York"],
  "billie-eilish": ["2001-12-18", "female", "洛杉矶", 34.052, -118.244, "America/Los_Angeles"],
  "ed-sheeran": ["1991-02-17", "male", "哈利法克斯", 53.721, -1.86, "Europe/London"],
  "the-weeknd": ["1990-02-16", "male", "多伦多", 43.653, -79.383, "America/Toronto"],
  "leonardo-dicaprio": ["1974-11-11", "male", "洛杉矶", 34.052, -118.244, "America/Los_Angeles"],
  "scarlett-johansson": ["1984-11-22", "female", "纽约", 40.713, -74.006, "America/New_York"],
  "emma-watson": ["1990-04-15", "female", "巴黎", 48.857, 2.352, "Europe/Paris"],
  "elon-musk": ["1971-06-28", "male", "比勒陀利亚", -25.747, 28.229, "Africa/Johannesburg"],
  "jeff-bezos": ["1964-01-12", "male", "阿尔伯克基", 35.084, -106.65, "America/Denver"],
  "mark-zuckerberg": ["1984-05-14", "male", "怀特普莱恩斯", 41.034, -73.763, "America/New_York"],
};

for (const file of readdirSync("scripts/foreign-reports")) {
  if (!file.endsWith(".json")) continue;
  const starId = file.replace(".json", "");
  const raw = JSON.parse(readFileSync(`scripts/foreign-reports/${file}`, "utf8"));
  const { heroBadges, ...reportOnly } = raw;
  const parsed = staticReadingSchema.safeParse(reportOnly);
  if (!parsed.success) throw new Error(`${starId} 结构校验失败: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`);
  const [birthDate, gender, place, lat, lon, tz] = BIRTH[starId];
  const chart = buildBaziChart({ birthDate, birthTime: "12:00", gender, city: { id: starId, name: place, lat, lon, tz } });
  const content = { ...parsed.data, heroPillars: chart.pillars.map((p) => p.ganzhi), ...(heroBadges ? { heroBadges } : {}) };
  const { error } = await supabase.from("consult_overrides").upsert({ star_id: starId, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
  if (error) throw new Error(`${starId} 入库失败: ${error.message}`);
  const words = Object.values(content.sections).reduce((n, s) => n + (s?.insights ?? []).reduce((m, i) => m + i.content.length, 0), 0);
  console.log(`✓ ${starId} 校验通过并入库,正文约 ${words} 字,四柱 ${content.heroPillars.join(" ")}`);
}
