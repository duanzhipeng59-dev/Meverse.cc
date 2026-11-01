// 只读分析:10-30/10-31 新注册批次的行为漏斗(注册→排盘→支付尝试→付费),并与当周付费用户对照。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const cst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000);
const cstDay = (iso) => { const d = cst(iso); return d.toISOString().slice(0, 10); };
const cstHour = (iso) => { const d = cst(iso); return d.toISOString().slice(11, 13); };

// ---- 全量用户(144 量级) ----
const users = [];
for (let page = 1; page <= 50; page++) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  if (users.length >= (res.total ?? res.data?.total ?? users.length)) break;
}

// ---- 全量订单 + 排盘记录 ----
async function pullAll(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from(table).select(cols).range(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}
const creditOrders = await pullAll("report_credit_orders", "out_trade_no,user_id,package_id,amount,status,created_at,paid_at");
const subOrders = await pullAll("payment_orders", "out_trade_no,user_id,product_name,amount,status,created_at,paid_at");
const readings = await pullAll("reading_reports", "id,user_id,mode,status,created_at");

// ---- 本周分日漏斗 ----
const batch = users.filter((u) => cstDay(u.created_at) >= "2026-10-26");
console.log("== 本周(10-26 起)分日漏斗 ==");
console.log("注册日    注册  到确认页(有排盘记录)  点开始(有generating+)  支付尝试  付费");
const byDay = new Map();
for (const u of batch) {
  const d = cstDay(u.created_at);
  const o = byDay.get(d) ?? { signups: 0, reached: 0, started: 0, attempted: 0, paid: 0 };
  o.signups += 1;
  if (readings.some((r) => r.user_id === u.id)) o.reached += 1;
  if (readings.some((r) => r.user_id === u.id && r.status !== "pending")) o.started += 1;
  if ([...creditOrders, ...subOrders].some((x) => x.user_id === u.id)) o.attempted += 1;
  if ([...creditOrders, ...subOrders].some((x) => x.user_id === u.id && (x.status === "paid" || x.status === "fulfilled" || x.paid_at))) o.paid += 1;
  byDay.set(d, o);
}
for (const [d, o] of [...byDay].sort()) {
  console.log(`${d}  ${String(o.signups).padStart(4)}  ${String(o.reached).padStart(8)}  ${String(o.started).padStart(12)}  ${String(o.attempted).padStart(8)}  ${String(o.paid).padStart(4)}`);
}

// ---- 本周 4 个付费用户是谁(注册于哪天) ----
console.log("\n== 本周付费用户明细(注册日 | 注册时刻 | 付费单) ==");
for (const o of [...creditOrders, ...subOrders]) {
  if (!(o.status === "paid" || o.status === "fulfilled" || o.paid_at)) continue;
  const u = users.find((x) => x.id === o.user_id);
  if (!u || cstDay(u.created_at) < "2026-10-26") continue;
  console.log(`${cstDay(u.created_at)} ${cstHour(u.created_at)}时 | ${o.out_trade_no.slice(0, 10)} ${"package" in o ? o.package_id : o.product_name} ¥${o.amount} ${cstDay(o.paid_at ?? o.created_at)} ${cstHour(o.paid_at ?? o.created_at)}时`);
}

// ---- 10-30/10-31 批次逐人明细 ----
for (const day of ["2026-10-30", "2026-10-31"]) {
  const dayUsers = users.filter((u) => cstDay(u.created_at) === day);
  const domains = dayUsers.reduce((acc, u) => { const d = u.email?.split("@")[1] ?? "?"; acc[d] = (acc[d] ?? 0) + 1; return acc; }, {});
  const hours = dayUsers.reduce((acc, u) => { const h = cstHour(u.created_at); acc[h] = (acc[h] ?? 0) + 1; return acc; }, {});
  const neverBack = dayUsers.filter((u) => !u.last_sign_in_at || u.last_sign_in_at === u.created_at);
  console.log(`\n== ${day} 批次: ${dayUsers.length} 人 ==`);
  console.log("邮箱域:", JSON.stringify(domains));
  console.log("注册时段(北京时):", JSON.stringify(Object.fromEntries(Object.entries(hours).sort()), null, 0));
  console.log(`注册后未再登录(仅注册当次会话): ${neverBack.length}/${dayUsers.length}`);
  // 订单尝试(含 cancelled)
  const attempts = [...creditOrders, ...subOrders].filter((o) => dayUsers.some((u) => u.id === o.user_id));
  console.log(`订单尝试 ${attempts.length} 笔:`, attempts.map((o) => `${o.out_trade_no.slice(0, 6)}:${o.status}`).join(", ") || "无");
  // 排盘行为
  const rows = dayUsers.map((u) => {
    const rs = readings.filter((r) => r.user_id === u.id);
    const pending = rs.filter((r) => r.status === "pending").length;
    const started = rs.filter((r) => r.status !== "pending").length;
    return { email: u.email, hour: cstHour(u.created_at), back: u.last_sign_in_at && u.last_sign_in_at !== u.created_at ? "回访" : "单次", pending, started, mode: rs[0]?.mode ?? "-" };
  }).sort((a, b) => Number(b.pending + b.started) - Number(a.pending + a.started) || a.hour.localeCompare(b.hour));
  console.log("明细(email | 注册时 | 回访 | pending排盘 | 已启动生成 | 模式):");
  for (const r of rows.slice(0, 40)) console.log(`  ${r.email} | ${r.hour}时 | ${r.back} | ${r.pending} | ${r.started} | ${r.mode}`);
  if (rows.length > 40) console.log(`  …共 ${rows.length} 行,其余均为零行为`);
  const zero = rows.filter((r) => !r.pending && !r.started).length;
  console.log(`零排盘行为(连确认页都没到): ${zero}/${rows.length}`);
}
