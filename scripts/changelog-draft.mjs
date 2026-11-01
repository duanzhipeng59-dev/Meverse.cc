// 迭代日志草稿:从 CHANGELOG.md 最后记录日期的次日起拉 git log,按天分组、
// 按提交前缀映射成中文动词,打印可直接粘贴的骨架(再人工补用户视角与原因)。
// 用法: npm run changelog | node scripts/changelog-draft.mjs --since 2026-11-01
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const sinceIdx = args.indexOf("--since");
let since = sinceIdx >= 0 ? args[sinceIdx + 1] : null;

// 默认:CHANGELOG.md 里最近的日期,之后的提交都算新增量
if (!since) {
  const md = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const first = md.match(/^## (\d{4}-\d{2}-\d{2})/m);
  since = first ? first[1] : new Date().toISOString().slice(0, 10);
}

// 提交前缀 -> 中文动词;chore/docs 等内部提交默认跳过(--all 才显示)
const verbOf = (subject) => {
  if (subject.startsWith("feat")) return "增";
  if (subject.startsWith("fix")) return "修";
  if (subject.startsWith("style")) return "优化";
  if (/^(refine|refactor)/.test(subject)) return "改";
  return null;
};
const showAll = args.includes("--all");

const raw = execFileSync(
  "git",
  ["log", `--since=${since}T23:59:59`, "--date=format:%Y-%m-%d", "--pretty=format:%ad|%s"],
  { encoding: "utf8" },
).trim();
if (!raw) {
  console.log(`没有 ${since} 之后的新提交,无需更新。`);
  process.exit(0);
}

// 同一天同动词合并去重;每个提交一行,翻译留给人工
const byDay = new Map();
for (const line of raw.split("\n").reverse()) {
  const [date, subject] = line.split("|");
  const verb = verbOf(subject);
  if (!verb && !showAll) continue;
  const bucket = byDay.get(date) ?? [];
  bucket.push(`${verb ?? "·"}：${subject.replace(/^(feat|fix|style|refine|refactor|chore|docs)(\([^)]*\))?[:：]\s*/, "")}`);
  byDay.set(date, bucket);
}

console.log(`# 草稿(${since} 之后的提交,贴进 CHANGELOG.md 对应位置,改写成用户视角)\n`);
for (const [date, items] of [...byDay].sort((a, b) => b[0].localeCompare(a[0]))) {
  console.log(`## ${date}\n`);
  for (const it of items) console.log(`- ${it}`);
  console.log("");
}
