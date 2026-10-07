// 生辰报告内容种子:为已发布明星按当前引擎链生成初稿,写入 consult_overrides。
// 报告页已改为只读上传内容(不再运行时调用引擎);本脚本用于一次性迁移存量明星,
// 以及新明星入库后生成可人工精校的初稿。已有内容的明星默认跳过,--force 覆盖。
// 运行:npx tsx --env-file=.env.local scripts/seed-consult-overrides.ts [--force]
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildStarBaziReport } from "../app/myfate-star-bazi-report";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { buildConsultReport } from "../app/myfate-portrait-consult";
import { CONSULT_OVERRIDES } from "../app/myfate-consult-overrides";

type StarRow = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz: string | null;
  gender: string | null;
};

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY required");
const supabase = createClient(url, key);
const force = process.argv.includes("--force");

const { data: stars, error } = await supabase.from("celebrity_profiles")
  .select("id,name,birth_date,birth_time,birth_place,birth_lat,birth_lon,birth_tz,gender")
  .eq("published", true)
  .order("id");
if (error) throw error;

for (const row of stars as StarRow[]) {
  if (!force) {
    const { data: existing } = await supabase.from("consult_overrides").select("star_id").eq("star_id", row.id).maybeSingle();
    if (existing) {
      console.log(`skip ${row.id}(${row.name}) 已有内容`);
      continue;
    }
  }
  const chart = buildBaziChart({
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? "12:00",
    gender: row.gender === "female" ? "female" : "male",
    city: { id: row.id, name: row.birth_place ?? "首尔", lat: row.birth_lat ?? 37.5665, lon: row.birth_lon ?? 126.978, tz: row.birth_tz ?? "Asia/Seoul" },
  });
  const report = buildStarBaziReport(chart);
  const profile = buildBaziLifeProfile(chart);
  const consult = CONSULT_OVERRIDES[row.id] ?? buildConsultReport(chart, profile, report);
  const content = { ...consult, heroPillars: chart.pillars.map((pillar) => pillar.ganzhi) };
  const { error: upsertError } = await supabase.from("consult_overrides")
    .upsert({ star_id: row.id, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
  if (upsertError) {
    console.error(`fail ${row.id}:`, upsertError.message);
    continue;
  }
  console.log(`seeded ${row.id}(${row.name}) — ${CONSULT_OVERRIDES[row.id] ? "代码精校版" : "引擎初稿"}`);
}
console.log("done");
