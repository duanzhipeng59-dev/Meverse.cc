import { generateDualReading, dualReadingSchema } from "../app/myfate-dual-reading";
import { generateChatText } from "../app/api/myfate/personalize/model-provider";
import { readFileSync, writeFileSync } from "node:fs";
const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["\x27]/, "").replace(/["\x27]$/, "");
}
process.env.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
const subjectA = { name: "林知远", gender: "male" as const, birthDate: "1991-07-08", birthTime: "10:30", cityId: "ningbo", cityName: "宁波" };
const subjectB = { name: "苏晚晴", gender: "female" as const, birthDate: "1994-03-16", birthTime: "21:45", cityId: "hangzhou", cityName: "杭州" };
const t0 = Date.now();
const r = await generateDualReading(subjectA, subjectB, async (system, prompt) =>
  (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "deepseek", temperature: 0.35, maxTokens: 8000, json: true })).content);
console.log("生成成功", ((Date.now() - t0) / 1000).toFixed(0) + "s | schema:", dualReadingSchema.safeParse(r).success ? "通过" : "失败");
for (const [k, s] of Object.entries(r.sections)) console.log(k, "→", s.insights.map(i => i.label).join("、"));
console.log("\n【匹配定调】", r.sections.overview.insights[0].content.slice(0, 160));
console.log("\n【主要摩擦点】", r.sections.friction.insights[0].content.slice(0, 220));
console.log("\n【关系关键年】", r.sections.rhythm.insights[0].content.slice(0, 200));
writeFileSync("/tmp/dual-sample.json", JSON.stringify(r, null, 1));
