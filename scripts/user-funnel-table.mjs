// 只读:指定注册时间窗的用户 → 排盘明细 + 订单/付费状态,导出 CSV(一行一用户)。
// 用法: node --env-file=.env.local scripts/user-funnel-table.mjs --from 2026-10-30 [--to 2026-11-02] [--out outputs/xx.csv]
// --to 为开区间(当日 00:00 止),缺省=至今;时间均为北京时间。
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const args = process.argv.slice(2);
const val = (k, d) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : d);
const from = val("--from", "2026-10-30");
const to = val("--to", null);
const out = val("--out", `outputs/users-${from}.csv`);
const fromTs = Date.parse(`${from}T00:00:00+08:00`);
const toTs = to ? Date.parse(`${to}T00:00:00+08:00`) : Number.POSITIVE_INFINITY;

// ---- 用户分群 ----
const users = [];
for (let p = 1; p <= 50; p++) {
  const r = await db.auth.admin.listUsers({ page: p, perPage: 200 });
  const d = r.data?.users ?? r.data;
  if (!d?.length) break;
  users.push(...d);
  if (users.length >= (r.total ?? d.length)) break;
}
const batch = users.filter((u) => { const t = Date.parse(u.created_at); return t >= fromTs && t < toTs; });
const ids = batch.map((u) => u.id);

// ---- 排盘 + 订单(全量按窗内用户过滤) ----
const reports = [];
for (let i = 0; i < ids.length; i += 50) {
  const { data } = await db.from("reading_reports").select("user_id,mode,dual_type,status,subject_a,subject_b,created_at").in("user_id", ids.slice(i, i + 50)).order("created_at");
  if (data) reports.push(...data);
}
const orders = [];
for (const t of ["payment_orders", "report_credit_orders"]) {
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await db.from(t).select("user_id,amount,status,created_at,paid_at,package_id").in("user_id", ids.slice(i, i + 50));
    if (data) orders.push(...data.map((o) => ({ ...o, table: t.replace("_orders", "") })));
  }
}
const byUser = (rows) => {
  const m = new Map();
  for (const r of rows) m.set(r.user_id, [...(m.get(r.user_id) ?? []), r]);
  return m;
};
const reportsBy = byUser(reports);
const ordersBy = byUser(orders);

// ---- 展示 ----
const cst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
const g = (s) => (s?.gender === "male" ? "男" : s?.gender === "female" ? "女" : "?");
const subj = (s) => (s ? `${g(s)}·${s.birthDate ?? "?"}${s.birthTime ?? ""}·${s.cityName ?? "?"}·「${s.name ?? ""}」` : "");
const chartCell = (rs) => rs.map((r) =>
  `${r.mode === "dual" ? "双" + (r.dual_type === "love" ? "盘" : r.dual_type) : "单"}/${r.status}: ${subj(r.subject_a)}${r.subject_b ? " × " + subj(r.subject_b) : ""}`,
).join(" ; ");
const paidAmt = (os) => os.filter((o) => o.paid_at || (o.status === "paid" && !["refunded", "returned", "cancelled"].includes(o.status))).reduce((s, o) => s + Number(o.amount ?? 0), 0);
const payCell = (os) => {
  if (!os.length) return "无订单";
  const p = paidAmt(os);
  return p > 0 ? `已付费¥${p}` : `仅取消(${os.length}笔)`;
};

const head = "注册时间,邮箱,排盘数,排盘明细(模式/状态:性别·生日 时辰·城市·姓名),订单状态,付费总额,订单明细";
const rows = batch
  .sort((a, b) => a.created_at.localeCompare(b.created_at))
  .map((u) => {
    const rs = reportsBy.get(u.id) ?? [];
    const os = ordersBy.get(u.id) ?? [];
    return [cst(u.created_at), u.email, rs.length, chartCell(rs), payCell(os), paidAmt(os), os.map((o) => `${o.table}/${o.status}/¥${o.amount}/${o.package_id ?? ""}`).join(" ; ")].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
writeFileSync(out, "\uFEFF" + [head, ...rows].join("\n"), "utf8");

const paidUsers = batch.filter((u) => paidAmt(ordersBy.get(u.id) ?? []) > 0).length;
const withCharts = batch.filter((u) => (reportsBy.get(u.id) ?? []).length > 0).length;
console.log(`${from} 起 ${batch.length} 人注册;填盘 ${withCharts} 人(${reports.length} 条);付费 ${paidUsers} 人(¥${batch.reduce((s, u) => s + paidAmt(ordersBy.get(u.id) ?? []), 0)})`);

// 按注册日汇总(北京时间)
const byDay = new Map();
for (const u of batch) {
  const d = cst(u.created_at).slice(0, 10);
  const c = byDay.get(d) ?? { reg: 0, chart: 0, paid: 0, gmv: 0 };
  c.reg += 1;
  if ((reportsBy.get(u.id) ?? []).length) c.chart += 1;
  const amt = paidAmt(ordersBy.get(u.id) ?? []);
  if (amt > 0) { c.paid += 1; c.gmv += amt; }
  byDay.set(d, c);
}
console.log("\n日期         注册  填盘  付费  GMV");
for (const [d, c] of [...byDay].sort()) console.log(`${d}   ${String(c.reg).padStart(4)}  ${String(c.chart).padStart(4)}  ${String(c.paid).padStart(4)}  ¥${c.gmv}`);
console.log(`\nCSV → ${out}(${rows.length} 行)`);
