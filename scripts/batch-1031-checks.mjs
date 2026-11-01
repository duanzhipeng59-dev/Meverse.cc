// 只读补查:报表状态分布、付费闭环、无单却生成过报告的用户(疑似测试号/额度异常)。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const cstDay = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);

// 1) reading_reports 全量状态分布(分注册日)
const users = [];
for (let page = 1; page <= 50; page++) {
  const res = await db.auth.admin.listUsers({ page, perPage: 200 });
  const data = res.data?.users ?? res.data;
  if (!Array.isArray(data) || !data.length) break;
  users.push(...data);
  if (users.length >= (res.total ?? res.data?.total ?? users.length)) break;
}
const readings = [];
for (let from = 0; ; from += 1000) {
  const { data } = await db.from("reading_reports").select("id,user_id,mode,status,created_at").range(from, from + 999);
  if (!data?.length) break;
  readings.push(...data);
  if (data.length < 1000) break;
}
const userDay = new Map(users.map((u) => [u.id, cstDay(u.created_at)]));

console.log("== reading_reports 状态分布(按记录创建日) ==");
const dist = new Map();
for (const r of readings) {
  const d = cstDay(r.created_at);
  const k = `${d} ${r.status}`;
  dist.set(k, (dist.get(k) ?? 0) + 1);
}
for (const [k, v] of [...dist].sort()) console.log(`  ${k}: ${v}`);

// 2) 无订单却有过非 pending 报告的用户
const creditOrders = [];
for (let from = 0; ; from += 1000) {
  const { data } = await db.from("report_credit_orders").select("user_id,status,paid_at").range(from, from + 999);
  if (!data?.length) break;
  creditOrders.push(...data);
  if (data.length < 1000) break;
}
const paidUsers = new Set(creditOrders.filter((o) => o.status === "paid" || o.paid_at).map((o) => o.user_id));
const suspects = new Map();
for (const r of readings) {
  if (r.status === "pending") continue;
  if (paidUsers.has(r.user_id)) continue;
  suspects.set(r.user_id, (suspects.get(r.user_id) ?? 0) + 1);
}
console.log("\n== 无付费订单却有已启动报告的用户(测试号/额度异常排查) ==");
for (const [uid, n] of suspects) {
  const u = users.find((x) => x.id === uid);
  const statuses = readings.filter((r) => r.user_id === uid && r.status !== "pending").map((r) => r.status).join(",");
  console.log(`  ${u?.email ?? uid} | 注册 ${userDay.get(uid) ?? "?"} | 非pending报告 ${n} 条(${statuses})`);
}

// 3) 昨夜 4 个付费用户的闭环:付费后报告是否真在生成
console.log("\n== 昨夜付费用户闭环 ==");
for (const o of creditOrders.filter((x) => x.paid_at && cstDay(x.paid_at) >= "2026-10-31")) {
  const u = users.find((x) => x.id === o.user_id);
  const rs = readings.filter((r) => r.user_id === o.user_id);
  console.log(`  ${u?.email} | 注册 ${cstDay(u?.created_at)} | 付费 ${o.paid_at} | 报告: ${rs.map((r) => r.status).join(",") || "无"}`);
}
