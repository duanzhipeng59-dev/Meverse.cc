// 排盘数据包生成器:按出生资料算出完整命盘,输出可直接粘进生成提示词的 JSON。
// 生成 AI 拿到它后只做解读与写作,禁止再自行推算干支——彻底杜绝大运顺排/逆排排错。
// 用法:npx tsx scripts/star-chart.ts <生日YYYY-MM-DD> <时辰HH:MM> <male|female> [seoul|beijing|shanghai|tokyo|taipei] [--lat x --lon x --tz Asia/Seoul]
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
const [birthDate, birthTimeRaw, genderArg, cityArg] = positional;
// 固定规则:出生时辰未知时随机生成一次,生成后必须固化到 celebrity_profiles.birth_time,之后永远以落库值为准
const HOURS = ["00:30", "02:30", "04:30", "06:30", "08:30", "10:30", "12:30", "14:30", "16:30", "18:30", "20:30", "22:30"];
let birthTime = birthTimeRaw;
if (birthTimeRaw === "random") {
  birthTime = HOURS[Math.floor(Math.random() * 12)];
  console.error(`⚙ 已随机生成时辰: ${birthTime} —— 请将此值固化到 celebrity_profiles.birth_time,之后排盘一律用固定值`);
}
if (!birthDate || !birthTime || !genderArg) {
  console.error("用法:npx tsx scripts/star-chart.ts <生日> <时辰|random> <male|female> [城市] [--name 姓名(组合)] [--place 城市名] [--lat x --lon x --tz Asia/Seoul]");
  process.exit(1);
}
const city = {
  ...(CITIES[cityArg ?? "seoul"] ?? CITIES.seoul),
  ...(flag("--place") ? { name: flag("--place")! } : {}),
  ...(flag("--lat") && flag("--lon") ? { lat: Number(flag("--lat")), lon: Number(flag("--lon")) } : {}),
  ...(flag("--tz") ? { tz: flag("--tz")! } : {}),
};

const chart = buildBaziChart({ birthDate, birthTime, gender: genderArg === "female" ? "female" : "male", city: { id: "chart", ...city } });
const profile = buildBaziLifeProfile(chart);
const currentYear = new Date().getFullYear();

const pkg = {
  人物: flag("--name") ?? "(未提供,请仅按命理推导,跳过 facts 搜索)",
  出生资料: `${birthDate} ${birthTime} · ${city.name}${genderArg === "female" ? "(女)" : "(男)"}`,
  四柱: chart.pillars.map((p, i) => ({
    柱: `${["年", "月", "日", "时"][i]}柱`,
    干支: p.ganzhi,
    干十神: p.shiShenGan,
    藏干: p.hideGan.map((gan, j) => `${gan}(${p.hideShiShen[j]})`),
  })),
  日主: `${chart.dayMaster}${profile.summary.dayElement}`,
  五行计数: chart.wuXing,
  引擎旺衰判定: profile.summary.strength,
  引擎喜用: profile.summary.favorable,
  引擎忌神: profile.summary.cautious,
  大运: chart.daYun.steps.map((s) => ({
    干支: s.ganzhi,
    年龄: `${s.startAge}-${s.endAge}岁`,
    年份: `${s.startYear}-${s.endYear}`,
    当前: s.current ? "★当前大运" : "",
  })),
  流年干支: (() => {
    const GAN = "甲乙丙丁戊己庚辛壬癸";
    const ZHI = "子丑寅卯辰巳午未申酉戌亥";
    return Array.from({ length: 11 }, (_, i) => {
      const year = currentYear - 5 + i;
      const idx = ((year - 1984) % 60 + 60) % 60;
      return { 年份: year, 干支: GAN[idx % 10] + ZHI[idx % 12] };
    });
  })(),
};

console.log("──── 排盘数据包(整段复制进提示词的输入部分)────");
console.log(JSON.stringify(pkg, null, 1));
