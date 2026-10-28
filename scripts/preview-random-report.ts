// 本地预览脚本:随机取一个命盘,走与线上一致的生成管线(排盘→facts→prompt→模型→zod 校验),
// 把完整报告 JSON 打到 stdout。线上个人报告固定走 Gemini;本机无 Gemini 密钥时退 DeepSeek 预览。
import { readFileSync } from "node:fs";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { vedicCities } from "../app/myfate-cities";
import { buildStaticReadingFacts, generateStaticReading } from "../app/myfate-static-reading";
import { generateChatText } from "../app/api/myfate/personalize/model-provider";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = m2(match[2]);
}
function m2(raw: string): string {
  return raw.replace(/^["']/, "").replace(/["']$/, "");
}
function pick(list: string[]): string;
function pick(list: number[]): number;
function pick(list: unknown[]): unknown {
  return list[Math.floor(Math.random() * list.length)];
}
const pad2 = (value: number) => String(value).padStart(2, "0");

const year = pick([1988, 1991, 1993, 1995, 1996, 1999]);
const month = pick([1, 3, 5, 7, 8, 10, 11, 12]);
const day = 1 + Math.floor(Math.random() * 28);
const hour = Math.floor(Math.random() * 24);
const minute = pick(["05", "15", "30", "45"]);
const gender = pick(["male", "female"]);
const shanghaiCities = vedicCities.filter((item) => item.tz === "Asia/Shanghai");
const cityRow = shanghaiCities[Math.floor(Math.random() * shanghaiCities.length)];
// 可选固定参数: npm_script.ts <YYYY-MM-DD> <HH:mm> <male|female> <cityId>,便于同盘对比模版改动
const birthDate = process.argv[2] ?? year + "-" + pad2(month) + "-" + pad2(day);
const birthTime = process.argv[3] ?? pad2(hour) + ":" + minute;
const genderArg = process.argv[4] ?? gender;
const cityArg = vedicCities.find((item) => item.id === process.argv[5]);
const fixedCity = cityArg ?? cityRow;

const chart = buildBaziChart({ birthDate, birthTime, gender: genderArg === "male" ? "male" : "female", city: { id: fixedCity.id, name: fixedCity.name, lat: fixedCity.lat, lon: fixedCity.lon, tz: fixedCity.tz } });
const profile = buildBaziLifeProfile(chart);
const facts = buildStaticReadingFacts(chart, profile);
const provider = process.env.GEMINI_API_KEY ? "gemini" : "deepseek";
const maxTokens = provider === "gemini" ? 30000 : 8192;

console.error("[盘] " + birthDate + " " + birthTime + " " + (genderArg === "male" ? "乾造" : "坤造") + " " + fixedCity.name + " | " + chart.pillars.map((p) => p.ganzhi).join(" ") + " 日主" + chart.dayMaster + " | 模型:" + provider);
console.error("[神煞] " + facts.evidence.filter((e) => e.id.startsWith("shensha.")).map((e) => e.fact).join(" / "));

const content = await generateStaticReading(
  async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider, temperature: 0.35, maxTokens, json: true })).content,
  facts,
  profile,
);
console.log(JSON.stringify(content, null, 1));
