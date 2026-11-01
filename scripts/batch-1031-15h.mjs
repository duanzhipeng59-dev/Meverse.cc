// 只读:10-31 15:00(北京时)之后注册的用户明细 + 全站 cancelled 订单的归属时间线。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const cst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000);
const fmt = (iso) => cst(iso).toISOString().slice(5, 16).replace("T", " ");

const users = [];
for (let page = 1; page <= 50; page++) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  if (users.length >= (res.total ?? res.data?.total ?? users.length)) break;
}

const pullAll = async (table, cols) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from(table).select(cols).range(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
};
const readings = await pullAll("reading_reports", "id,user_id,mode,status,created_at");
const creditOrders = await pullAll("report_credit_orders", "out_trade_no,user_id,package_id,amount,status,created_at,paid_at");

// ---- 15点之后注册的用户 ----
const cutoff = Date.parse("2026-10-31T15:00:00+08:00");
const batch = users.filter((u) => Date.parse(u.created_at) >= cutoff);
console.log(`== 10-31 15:00 后注册: ${batch.length} 人 ==`);
const agg = { reached: 0, started: 0, attempted: 0, paid: 0, neverBack: 0 };
for (const u of batch) if (!u.last_sign_in_at || u.last_sign_in_at === u.created_at) agg.neverBack += 1;
const hours = {};
for (const u of batch) { const h = String(cst(u.created_at).getUTCHours()).padStart(2, "0"); hours[h] = (hours[h] ?? 0) + 1; }
console.log("注册时分布(北京时):", JSON.stringify(hours));

console.log("\nemail | 注册时刻 | 回访 | pending | 启动 | 订单");
for (const u of [...batch].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
  const rs = readings.filter((r) => r.user_id === u.id);
  const pending = rs.filter((r) => r.status === "pending").length;
  const started = rs.filter((r) => r.status !== "pending").length;
  const orders = creditOrders.filter((o) => o.user_id === u.id);
  if (pending) agg.reached += 1;
  if (started) agg.started += 1;
  if (orders.length) agg.attempted += 1;
  if (orders.some((o) => o.status === "paid")) agg.paid += 1;
  const os = orders.map((o) => `${o.status}¥${o.amount}`).join(",") || "-";
  if (pending || started || orders.length || true) {
    console.log(`${u.email} | ${fmt(u.created_at)} | ${u.last_sign_in_at && u.last_sign_in_at !== u.created_at ? "回访" : "单次"} | ${pending} | ${started} | ${os}`);
  }
}
console.log(`\n汇总: 到确认页 ${agg.reached}/${batch.length} | 启动生成 ${agg.started} | 订单尝试 ${agg.attempted} | 付费 ${agg.paid} | 注册后未回访 ${agg.neverBack}`);

// ---- 全站 cancelled 订单归属(用户注册日 × 下单时刻) ----
console.log("\n== 全站 cancelled 次数订单:下单时刻 | 下单人注册日 ==");
const rows = creditOrders.filter((o) => o.status === "cancelled").sort((a, b) => a.created_at.localeCompare(b.created_at));
const byDay = {};
for (const o of rows) {
  const u = users.find((x) => x.id === o.user_id);
  const k = `${fmt(o.created_at).slice(0, 5)} 下单 ← 注册于 ${u ? fmt(u.created_at).slice(0, 5) : "?"}`;
  byDay[k] = (byDay[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(byDay)) console.log(`  ${k}: ${v} 笔`);
// cancelled 里 15点后批次用户的
const lateCxl = rows.filter((o) => batch.some((u) => u.id === o.user_id));
console.log(`\ncancelled 属于「10-31 15点后注册」用户的: ${lateCxl.length} 笔`);
