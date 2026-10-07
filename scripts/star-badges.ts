// 三枚圆形标签生成器:按出生资料排盘,输出 [「X X日主」,「身强|中和|身弱」,「喜用 X · X」]。
// 用法:npx tsx scripts/star-badges.ts <生日YYYY-MM-DD> <时辰HH:MM> <male|female> [城市]
//      城市预设:seoul(默认)/beijing/shanghai/tokyo/taipei;其他城市用 --lat --lon --tz 覆盖
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";

const CITIES: Record<string, { name: string; lat: number; lon: number; tz: string }> = {
  seoul: { name: "首尔 · 韩国", lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" },
  beijing: { name: "北京 · 中国", lat: 39.9042, lon: 116.4074, tz: "Asia/Shanghai" },
  shanghai: { name: "上海 · 中国", lat: 31.2304, lon: 121.4737, tz: "Asia/Shanghai" },
  tokyo: { name: "东京 · 日本", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  taipei: { name: "台北 · 中国台湾", lat: 25.033, lon: 121.5654, tz: "Asia/Taipei" },
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")));
const [birthDate, birthTime, genderArg, cityArg] = positional;
if (!birthDate || !birthTime || !genderArg) {
  console.error("用法:npx tsx scripts/star-badges.ts <生日YYYY-MM-DD> <时辰HH:MM> <male|female> [seoul|beijing|shanghai|tokyo|taipei] [--lat x --lon x --tz Asia/Seoul]");
  process.exit(1);
}
const city = {
  ...(CITIES[cityArg ?? "seoul"] ?? CITIES.seoul),
  ...(flag("--lat") && flag("--lon") ? { lat: Number(flag("--lat")), lon: Number(flag("--lon")) } : {}),
  ...(flag("--tz") ? { tz: flag("--tz")! } : {}),
};

const chart = buildBaziChart({
  birthDate, birthTime,
  gender: genderArg === "female" ? "female" : "male",
  city: { id: "badges", ...city },
});
const profile = buildBaziLifeProfile(chart);
const badges = [
  `${chart.dayMaster}${profile.summary.dayElement}日主`,
  profile.summary.strength,
  `喜用 ${profile.summary.favorable.join(" · ")}`,
];

console.log(`四柱: ${chart.pillars.map((p) => p.ganzhi).join(" ")}`);
console.log(`喜忌: 喜${profile.summary.favorable.join("、")} / 忌${profile.summary.cautious.join("、")}`);
console.log(`当前大运: ${chart.currentDaYunGanZhi} | 今年流年: ${chart.currentYearGanZhi}`);
console.log("\n三枚标签(直接复制进 heroBadges):");
console.log(JSON.stringify(badges));
