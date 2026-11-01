// 管理操作:给指定邮箱用户充值报告/追问额度(ledger 记账,走与购买同一条链路)。
// 用法: node --env-file=.env.local scripts/grant-credits.mjs <email> <报告次数> <追问次数>
import { createClient } from "@supabase/supabase-js";

const [email, reportN, askN] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
if (!email || !reportN || !askN) { console.error("用法: node --env-file=.env.local scripts/grant-credits.mjs <email> <报告次数> <追问次数>"); process.exit(1); }
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const users = [];
for (let p = 1; p <= 50; p++) { const r = await db.auth.admin.listUsers({ page: p, perPage: 200 }); const d = r.data?.users ?? r.data; if (!d?.length) break; users.push(...d); const total = r.total ?? r.data?.total ?? d.length; if (users.length >= total || p >= 50) break; }
const user = users.find((u) => u.email === email);
if (!user) { console.error(`未找到用户: ${email}`); process.exit(1); }

const before = {
  report: (await db.rpc("get_report_credits", { p_user_id: user.id })).data,
  ask: (await db.rpc("get_ask_credit_bank", { p_user_id: user.id })).data,
};

const { error: e1 } = await db.from("report_credit_ledger").insert({ user_id: user.id, delta: reportN, source: "grant" });
const { error: e2 } = await db.from("ask_credit_ledger").insert({ user_id: user.id, delta: askN, source: "refund", order_no: `admin-grant-${new Date().toISOString().slice(0, 10)}` });
if (e1 || e2) { console.error("写入失败:", e1?.message, e2?.message); process.exit(1); }

const after = {
  report: (await db.rpc("get_report_credits", { p_user_id: user.id })).data,
  ask: (await db.rpc("get_ask_credit_bank", { p_user_id: user.id })).data,
};
console.log(`${email} (${user.id.slice(0, 8)}…)`);
console.log(`报告次数: ${before.report} → ${after.report} (+${after.report - before.report})`);
console.log(`追问次数: ${before.ask} → ${after.ask} (+${after.ask - before.ask})`);
if (after.report - before.report !== reportN || after.ask - before.ask !== askN) { console.error("!! 到账数与请求不符,请检查"); process.exit(1); }
console.log("✓ 到账确认");
