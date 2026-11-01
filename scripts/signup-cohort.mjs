// 只读:2026-10-31 15:00(+08) 之后注册的用户清单与数量(GA4 漏斗分母核对用)。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// 北京时间 2026-10-31 15:00 = UTC 07:00
const SINCE_UTC = "2026-10-31T07:00:00.000Z";
const fmtCst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().replace("T", " ").slice(0, 16);

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

const cohort = users
  .filter((u) => new Date(u.created_at) >= new Date(SINCE_UTC))
  .sort((a, b) => a.created_at.localeCompare(b.created_at));

console.log(`2026-10-31 15:00(北京时间)之后注册: ${cohort.length} 人 / 全量 ${users.length} 人\n`);
console.log("注册时间(北京)      邮箱");
for (const u of cohort) console.log(`${fmtCst(u.created_at)}   ${u.email}`);
