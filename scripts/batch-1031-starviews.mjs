// 只读:15点后批次 vs 凌晨付费波的明星报告浏览对比。
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const cst = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000);

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
const views = await pullAll("star_report_views", "user_id,star_id,view_count,last_viewed_at");
const asks = await pullAll("ask_conversations", "user_id,star_id,message_count");

const cohorts = {
  "凌晨付费波(10-31 00-04时)": [Date.parse("2026-10-31T00:00:00+08:00"), Date.parse("2026-10-31T05:00:00+08:00")],
  "15点后批次(10-31 15时起)": [Date.parse("2026-10-31T15:00:00+08:00"), Date.now()],
};

for (const [name, [from, to]] of Object.entries(cohorts)) {
  const cohort = users.filter((u) => Date.parse(u.created_at) >= from && Date.parse(u.created_at) < to);
  const ids = new Set(cohort.map((u) => u.id));
  const vRows = views.filter((v) => ids.has(v.user_id));
  const viewers = new Set(vRows.map((v) => v.user_id));
  const askRows = asks.filter((a) => ids.has(a.user_id));
  const askers = new Set(askRows.map((a) => a.user_id));
  console.log(`\n== ${name}: ${cohort.length} 人 ==`);
  console.log(`看过明星报告: ${viewers.size} 人 (${(viewers.size / cohort.length * 100).toFixed(0)}%) | 合计浏览 ${vRows.reduce((s, v) => s + v.view_count, 0)} 次 / ${vRows.length} 份报告`);
  const top = vRows.slice().sort((a, b) => b.view_count - a.view_count).slice(0, 8);
  console.log("热门报告:", top.map((v) => `${v.star_id}×${v.view_count}`).join(", ") || "无");
  console.log(`有 AI 追问会话: ${askers.size} 人, 消息 ${askRows.reduce((s, a) => s + (a.message_count ?? 0), 0)} 条`);
  // 看过报告的人里,有多少同时也做了排盘(pending)/付费
  const readings = await pullAll("reading_reports", "user_id,status");
  const viewerIds = [...viewers];
  const alsoPending = viewerIds.filter((id) => readings.some((r) => r.user_id === id)).length;
  console.log(`(看过报告的 ${viewerIds.length} 人中,又去排过盘的: ${alsoPending})`);
}
