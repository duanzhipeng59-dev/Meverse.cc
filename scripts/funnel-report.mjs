// 只读漏斗报告:注册分群 → 付费 → LTV(UV/PV/停留时长无埋点,不在本脚本范围)。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const pad = (n) => String(n).padStart(2, "0");
// 统一用北京时间分桶
const cstDate = (iso) => {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

// ---- 1) 注册用户(全量拉取,144 量级没问题) ----
const users = [];
let page = 1;
for (;;) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  const total = res.total ?? res.data?.total ?? users.length;
  if (users.length >= total || page > 50) break;
  page += 1;
}
const userRows = users.map((u) => ({ id: u.id, email: u.email, created: cstDate(u.created_at) }));

// ---- 2) 两张订单表全量(量级小,直接拉) ----
async function pullOrders(table, amountCol = "amount") {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data } = await db.from(table).select(`user_id,status,paid_at,created_at,${amountCol}`).range(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}
const paymentOrders = await pullOrders("payment_orders");
const creditOrders = await pullOrders("report_credit_orders");

console.log(`== 订单状态分布 ==`);
const byStatus = (rows) => rows.reduce((acc, o) => ((acc[o.status] = (acc[o.status] ?? 0) + 1), acc), {});
console.log("payment_orders:", JSON.stringify(byStatus(paymentOrders)));
console.log("report_credit_orders:", JSON.stringify(byStatus(creditOrders)));

// paid 判定:优先 paid_at,其次 status
const isPaid = (o) => o.status === "paid" || (o.paid_at != null && o.status !== "refunded" && o.status !== "returned" && o.status !== "cancelled");
const paidAll = [...paymentOrders, ...creditOrders].filter(isPaid);
console.log(`\npaid 订单数: ${paidAll.length}`);

// ---- 3) 汇总指标 ----
const day = (iso) => (iso ? cstDate(iso) : null);
const paidByUser = new Map(); // user_id -> { amount, first, last, count }
for (const o of paidAll) {
  const when = day(o.paid_at ?? o.created_at);
  if (!o.user_id || !when) continue;
  const cur = paidByUser.get(o.user_id) ?? { amount: 0, count: 0, first: when, last: when };
  cur.amount += Number(o.amount ?? 0);
  cur.count += 1;
  cur.first = when < cur.first ? when : cur.first;
  cur.last = when > cur.last ? when : cur.last;
  paidByUser.set(o.user_id, cur);
}

const totalGmv = [...paidByUser.values()].reduce((s, v) => s + v.amount, 0);
const payingUsers = [...paidByUser.entries()].filter(([id]) => userRows.some((u) => u.id === id));
console.log(`\n== 全量 ==`);
console.log(`注册用户: ${userRows.length} | 付费用户(注册体系内): ${payingUsers.length} | 注册→付费: ${(payingUsers.length / userRows.length * 100).toFixed(1)}%`);
console.log(`累计 GMV(paid): ¥${totalGmv.toFixed(2)} | ARPPU: ¥${(totalGmv / Math.max(payingUsers.length, 1)).toFixed(2)} | 全员 ARPU: ¥${(totalGmv / userRows.length).toFixed(2)}`);
const orphanPaid = [...paidByUser.keys()].filter((id) => !userRows.some((u) => u.id === id));
if (orphanPaid.length) console.log(`(有 ${orphanPaid.length} 个付费 user_id 不在 auth.users,未计入上两行分母)`);

// ---- 4) 按注册周分群(cohort LTV) ----
const weekKey = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  const dow = (d.getUTCDay() + 6) % 7; // 周一为一周起点
  const monday = new Date(d.getTime() - dow * 86400_000);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
};
const cohorts = new Map(); // week -> { users, paidUsers, gmv }
for (const u of userRows) {
  const wk = weekKey(u.created);
  const c = cohorts.get(wk) ?? { users: 0, paidUsers: 0, gmv: 0 };
  c.users += 1;
  cohorts.set(wk, c);
}
for (const [uid, v] of paidByUser) {
  const u = userRows.find((x) => x.id === uid);
  if (!u) continue;
  const c = cohorts.get(weekKey(u.created));
  if (!c) continue;
  c.paidUsers += 1;
  c.gmv += v.amount;
}
console.log(`\n== 按注册周分群(北京时间,周一开局) ==`);
console.log("注册周     注册  付费  付费率   GMV(¥)   人均LTV(¥)");
for (const [wk, c] of [...cohorts].sort()) {
  console.log(`${wk}  ${String(c.users).padStart(4)}  ${String(c.paidUsers).padStart(4)}  ${(c.paidUsers / c.users * 100).toFixed(1).padStart(5)}%  ${c.gmv.toFixed(2).padStart(8)}  ${(c.gmv / c.users).toFixed(2).padStart(9)}`);
}

// ---- 5) 最近 14 天的日粒度注册 + 付费 ----
const today = cstDate(new Date());
const from14 = cstDate(new Date(Date.now() - 13 * 86400_000));
const signupDaily = userRows.filter((u) => u.created >= from14).reduce((acc, u) => ((acc[u.created] = (acc[u.created] ?? 0) + 1), acc), {});
const paidDaily = paidAll.filter((o) => day(o.paid_at ?? o.created_at) >= from14).reduce((acc, o) => {
  const d = day(o.paid_at ?? o.created_at);
  acc[d] = (acc[d] ?? 0) + Number(o.amount ?? 0);
  return acc;
}, {});
console.log(`\n== 最近 14 天(${from14} ~ ${today}) ==`);
console.log("日期        新注册  当日GMV(¥)");
for (let i = 0; i < 14; i++) {
  const d = cstDate(new Date(Date.now() - (13 - i) * 86400_000));
  console.log(`${d}   ${String(signupDaily[d] ?? 0).padStart(4)}   ${(paidDaily[d] ?? 0).toFixed(2).padStart(8)}`);
}

// ---- 6) 付费到注册的时滞(首单距注册天数分布,看转化速度) ----
const lagBuckets = { "当天": 0, "1-3天": 0, "4-7天": 0, "8-30天": 0, "30天+": 0 };
for (const [uid, v] of paidByUser) {
  const u = userRows.find((x) => x.id === uid);
  if (!u) continue;
  const lag = Math.round((new Date(`${v.first}T00:00:00+08:00`) - new Date(`${u.created}T00:00:00+08:00`)) / 86400_000);
  if (lag <= 0) lagBuckets["当天"]++;
  else if (lag <= 3) lagBuckets["1-3天"]++;
  else if (lag <= 7) lagBuckets["4-7天"]++;
  else if (lag <= 30) lagBuckets["8-30天"]++;
  else lagBuckets["30天+"]++;
}
console.log(`\n== 首单时滞(注册→首次付费) ==`, JSON.stringify(lagBuckets));
