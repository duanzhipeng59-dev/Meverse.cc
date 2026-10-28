// 一次性脚本:把指定 reading_reports 行的内容替换为本地生成的预览报告,
// 并把 subject_a 对齐到预览盘(1991-07-08 10:30 乾造 宁波),供手机上查看实际展示效果。
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']/, "").replace(/["']$/, "");
}

const reportId = process.argv[2];
const jsonPath = process.argv[3];
if (!reportId || !jsonPath) throw new Error("usage: tsx replace-reading-content.ts <reportId> <report.json>");

const content = JSON.parse(readFileSync(jsonPath, "utf8"));
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const { error } = await admin.from("reading_reports").update({
  content,
  status: "ready",
  error: null,
  subject_a: { name: "本人", gender: "male", birthDate: "1991-07-08", birthTime: "10:30", cityId: "ningbo", cityName: "宁波" },
  updated_at: new Date().toISOString(),
}).eq("id", reportId);
if (error) throw error;
console.log("updated", reportId);
