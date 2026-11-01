// 只读:指定注册时间窗(北京时间)的用户群,拉排盘数据 + 订单行为。
// 用法: node --env-file=.env.local scripts/batch-chart-data.mjs --from 2026-10-30 --to 2026-10-31
//   --from 当日 00:00 起;--to 为开区间(次日 00:00 止);默认 10-31 15:00 之后的批次。
// 「是否点击确认页→订阅页」无服务端埋点:GA4 10-31 15:00 才上线且未设 user_id,
// 逐用户归因不可行;订单列是 DB 里最接近的付费意向信号。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const args = process.argv.slice(2);
const val = (k, d) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : d);
const from = val("--from", "2026-10-31");
const to = val("--to", null);
const fromTs = Date.parse(`${from}T00:00:00+08:00`);
const toTs = to ? Date.parse(`${to}T00:00:00+08:00`) : Number.POSITIVE_INFINITY;

// ---- 1) 分群 ----
const users = [];
for (let page = 1; page <= 50; page++) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  if (users.length >= (res.total ?? res.data?.total ?? users.length)) break;
}
const batch = users.filter((u) => {
  const t = Date.parse(u.created_at);
  return t >= fromTs && t < toTs;
});
const ids = batch.map((u) => u.id);
const emailOf = new Map(batch.map((u) => [u.id, u.email]));

// ---- 2) 排盘 + 订单 ----
const reports = [];
for (let i = 0; i < ids.length; i += 50) {
  const { data } = await db
    .from("reading_reports")
    .select("user_id,mode,dual_type,status,subject_a,subject_b,created_at")
    .in("user_id", ids.slice(i, i + 50))
    .order("created_at");
  if (data) reports.push(...data);
}
const orders = [];
for (const t of ["payment_orders", "report_credit_orders"]) {
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await db.from(t).select("user_id,amount,status,created_at,paid_at").in("user_id", ids.slice(i, i + 50));
    if (data) orders.push(...data.map((o) => ({ ...o, table: t.replace("_orders", "") })));
  }
}
const ordersByUser = new Map();
for (const o of orders) ordersByUser.set(o.user_id, [...(ordersByUser.get(o.user_id) ?? []), o]);

// ---- 3) 展示 ----
const fmt = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(5, 16).replace("T", " ");
const subj = (s) =>
  s ? `${s.gender === "male" ? "男" : s.gender === "female" ? "女" : s.gender ?? "?"} · ${s.birthDate ?? "?"}${s.birthTime ? " " + s.birthTime : ""} · ${s.cityName ?? "?"} · 「${s.name ?? "未填名"}」` : "—";
const orderStr = (uid) => (ordersByUser.get(uid) ?? []).map((o) => `${o.table}:${o.status}:¥${o.amount}`).join(" ") || "无";

console.log(`== ${from} 注册 ${batch.length} 人,排盘 ${reports.length} 条,订单 ${orders.length} 条 ==`);
console.log(`状态: ${JSON.stringify(reports.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}))}  订单: ${JSON.stringify(orders.reduce((a, o) => ((a[o.status] = (a[o.status] ?? 0) + 1), a), {}))}\n`);
for (const r of reports) {
  console.log(`${fmt(r.created_at)}  ${emailOf.get(r.user_id) ?? r.user_id.slice(0, 8)}  [订单:${orderStr(r.user_id)}]`);
  console.log(`  [${r.mode === "dual" ? `双人·${r.dual_type === "love" ? "合盘" : r.dual_type}` : "单人"}·${r.status}] A: ${subj(r.subject_a)}`);
  if (r.subject_b) console.log(`  ${" ".repeat(2)}B: ${subj(r.subject_b)}`);
}
