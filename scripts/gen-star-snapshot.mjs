// 重新生成 app/myfate-star-snapshot.ts(全量明星快照兜底)。
// 何时跑:新增/下架明星、更换头像或调整排序后。
// 用法:node scripts/gen-star-snapshot.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const { data, error } = await supabase.from("celebrity_profiles")
  .select("id,name,role,birth_date,gender,mbti,categories,portrait_url,created_at,homepage_featured")
  .eq("published", true)
  .order("workspace_position", { ascending: true, nullsFirst: false })
  .order("created_at", { ascending: true });
if (error) throw error;

const items = (data ?? []).map((row) => ({
  id: row.id,
  name: row.name,
  role: row.role ?? "明星",
  birthDate: row.birth_date,
  gender: row.gender ?? "unknown",
  mbti: row.mbti ?? "",
  categories: row.categories ?? [],
  portraitSrc: row.portrait_url ?? "",
  createdAt: row.created_at ?? "",
  homepageFeatured: Boolean(row.homepage_featured),
}));

const banner = `// 明星列表全量快照:Supabase 免费层网关限流导致查询偶发超时时,静态兜底显示完整列表而非空/残缺名单。
// 由 scripts/gen-star-snapshot.mjs 从 celebrity_profiles(published=true) 导出;名单/头像变更后重跑刷新。
// AUTO-GENERATED — do not edit by hand.
`;
writeFileSync("app/myfate-star-snapshot.ts", banner + "export const STAR_SNAPSHOT: StarListItem[] = " + JSON.stringify(items, null, 2) + ";\n");
console.log(`snapshot written: ${items.length} people`);
