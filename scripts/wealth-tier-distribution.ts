// 只读:存量盘面的财富档位分布统计——自填报告的全部 subject + 全部发布明星,
// 逐盘跑确定性定档,输出直方图与分位数,用于校准 scoreBand 阈值。
// 用法: npx tsx --env-file=.env.local scripts/wealth-tier-distribution.ts
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { computeWealthTier } from "../app/myfate-wealth-tier";
import { vedicCities } from "../app/myfate-cities";

// 收集去重盘面:自填 subject(reading_reports)+ 明星出生资料
const charts = new Map<string, { name?: string; birthDate: string; birthTime: string; gender: "male" | "female"; cityId: string; }>(); // key -> {birthDate,birthTime,gender,cityId,name}
const seen = new Set();

const { data: reports } = await db.from("reading_reports").select("mode,subject_a,subject_b").range(0, 1999);
for (const row of reports ?? []) {
  for (const subject of [row.subject_a, row.subject_b]) {
    if (!subject) continue;
    const key = `${subject.birthDate}|${subject.birthTime}|${subject.gender}|${subject.cityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    charts.set(key, { name: subject.name, ...subject });
  }
}
const { data: stars } = await db.from("celebrity_profiles").select("id,name,birth_date,birth_time,gender,birth_lat,birth_lon,birth_tz").eq("published", true);
for (const star of stars ?? []) {
  if (!star.birth_date || !star.birth_time) continue;
  const key = `${star.birth_date}|${star.birth_time}|${star.gender}|star:${star.id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  // 明星按坐标就近城市(与 records API 同规则)
  let best = vedicCities[0];
  let bestDist = Infinity;
  for (const city of vedicCities) {
    const d = (city.lat - star.birth_lat) ** 2 + (city.lon - star.birth_lon) ** 2;
    if (d < bestDist) { bestDist = d; best = city; }
  }
  charts.set(key, {
    name: star.name,
    birthDate: star.birth_date,
    birthTime: star.birth_time,
    gender: star.gender === "female" ? "female" : "male",
    cityId: best.id,
  });
}

import type { WealthTierKey } from "../app/myfate-wealth-tier";
const histogram: Partial<Record<WealthTierKey, number>> = {};
const scores: number[] = [];
const samples: Partial<Record<WealthTierKey, string>> = {};
for (const chart of charts.values()) {
  const city = vedicCities.find((item) => item.id === chart.cityId) ?? vedicCities.find((item) => item.id === "beijing");
  const bazi = buildBaziChart({
    birthDate: chart.birthDate,
    birthTime: chart.birthTime,
    gender: chart.gender,
    city: { id: chart.cityId, name: city?.name ?? "", lat: city?.lat ?? 0, lon: city?.lon ?? 0, tz: city?.tz ?? "Asia/Shanghai" },
  });
  const profile = buildBaziLifeProfile(bazi);
  const tier = computeWealthTier(bazi, profile);
  histogram[tier.tier] = (histogram[tier.tier] ?? 0) + 1;
  scores.push(tier.baseScore);
  if (!samples[tier.tier]) samples[tier.tier] = `${chart.name || chart.birthDate}(${chart.birthDate}) 分${tier.baseScore}`;
}

const total = charts.size;
scores.sort((a, b) => a - b);
const pct = (p: number) => scores[Math.floor(scores.length * p)] ?? "-";
console.log(`样本: ${total} 个去重盘面\n`);
console.log("档位分布:");
for (const tier of ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] as const) {
  const count = histogram[tier] ?? 0;
  const bar = "█".repeat(Math.round((count / total) * 50));
  console.log(`${tier} ${String(count).padStart(4)} (${String(Math.round((count / total) * 100)).padStart(2)}%) ${bar}  ${samples[tier] ?? ""}`);
}
console.log(`\n基准分: min=${scores[0]} p25=${pct(0.25)} p50=${pct(0.5)} p75=${pct(0.75)} max=${scores[scores.length - 1]}`);
