// 只读:拉 10-30 批次免费生成者的额度流水,定位余额来源。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const suspects = [
  "furao5514@gmail.com", "bubblecui00@gmail.com", "cyn03901177@163.com",
  "1054509468@qq.com", "3447142640@qq.com", "dawnie.bukuganda@gmail.com", "ro9101415@yahoo.com.tw",
];
const users = [];
for (let page = 1; page <= 50; page++) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  if (users.length >= (res.total ?? res.data?.total ?? users.length)) break;
}
for (const email of suspects) {
  const u = users.find((x) => x.email === email);
  if (!u) { console.log(`${email}: 用户未找到`); continue; }
  const { data } = await db.from("report_credit_ledger").select("delta,source,order_no,created_at").eq("user_id", u.id).order("created_at");
  const cst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(5, 16).replace("T", " ");
  console.log(`\n${email}`);
  for (const row of data ?? []) console.log(`  ${cst(row.created_at)}  ${row.delta > 0 ? "+" : ""}${row.delta}  ${row.source}  ${row.order_no ?? "-"}`);
}
// 顺带:全站流水里 source 的分布(有没有 grant/bonus 之类的来源)
const all = [];
for (let from = 0; ; from += 1000) {
  const { data } = await db.from("report_credit_ledger").select("source").range(from, from + 999);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
}
const bySource = all.reduce((acc, r) => { acc[r.source] = (acc[r.source] ?? 0) + r.delta; return acc; }, {});
console.log("\n全站 ledger 来源汇总(净delta):", JSON.stringify(bySource));
