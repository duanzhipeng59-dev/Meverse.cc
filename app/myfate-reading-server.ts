// 解读报告(用户自填人物,单/双统一)的数据访问:全部走 service role,路由层校验归属。
import { createSupabaseAdminClient } from "./api/auth/server";

export type ReadingSubject = {
  name: string;
  gender: "male" | "female";
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  cityId: string;
  cityName: string;
};

export type ReadingReportRow = {
  id: string;
  userId: string;
  mode: "single" | "dual";
  dualType: "love" | "career";
  // pending = 已进排盘确认页但未点「开始解读」(退出后以「待生成」保留在生成记录)
  status: "pending" | "generating" | "ready" | "failed";
  subjectA: ReadingSubject;
  subjectB: ReadingSubject | null;
  content: unknown;
  createdAt: string;
};

// 后台任务被平台中断时没有机会回写状态，避免历史记录永久停在「生成中」。
// Vercel 函数上限 300s;generating 超 6 分钟必是函数被强杀,轮询时自愈标失败
export const READING_GENERATION_STALE_MS = 6 * 60 * 1000;

function mapRow(row: Record<string, unknown>): ReadingReportRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as "single" | "dual",
    dualType: (row.dual_type === "career" ? "career" : "love"),
    status: (row.status === "pending" || row.status === "ready" || row.status === "failed" ? row.status : "generating") as ReadingReportRow["status"],
    subjectA: row.subject_a as ReadingSubject,
    subjectB: (row.subject_b ?? null) as ReadingSubject | null,
    content: row.content ?? null,
    createdAt: row.created_at as string,
  };
}

// jsonb 的键序与客户端载荷不一致,subject 相等按字段逐一比较
function subjectsEqual(a: ReadingSubject, b: ReadingSubject): boolean {
  return a.name === b.name && a.gender === b.gender && a.birthDate === b.birthDate
    && a.birthTime === b.birthTime && a.cityId === b.cityId && a.cityName === b.cityName;
}

export async function createReadingReport(input: { userId: string; mode: "single" | "dual"; dualType?: "love" | "career"; subjectA: ReadingSubject; subjectB?: ReadingSubject | null; status?: "generating" | "pending" }): Promise<string> {
  const admin = createSupabaseAdminClient();
  // 待生成去重:同一人(或同一对)反复进排盘页又退出,只保留一条「待生成」
  if (input.status === "pending") {
    const { data: pendingRows } = await admin.from("reading_reports")
      .select("id,subject_a,subject_b")
      .eq("user_id", input.userId)
      .eq("mode", input.mode)
      .eq("status", "pending");
    const duplicated = (pendingRows ?? []).find((row) => {
      const storedA = row.subject_a as ReadingSubject;
      if (!storedA || !subjectsEqual(storedA, input.subjectA)) return false;
      if (input.mode === "single") return true;
      const storedB = row.subject_b as ReadingSubject | null;
      return Boolean(storedB && input.subjectB && subjectsEqual(storedB, input.subjectB));
    });
    if (duplicated?.id) return duplicated.id as string;
  }
  const { data, error } = await admin
    .from("reading_reports")
    .insert({ user_id: input.userId, mode: input.mode, dual_type: input.dualType ?? "love", subject_a: input.subjectA, subject_b: input.subjectB ?? null, status: input.status ?? "generating" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// 待生成 → 生成中:created_at 一并重置,让进度条与超时自愈从启动这一刻起算。
// update 带 status=pending 条件做比较交换,并发重复启动时第二次返回 null。
export async function startReadingReport(id: string): Promise<ReadingReportRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .update({ status: "generating", created_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,user_id,mode,dual_type,status,subject_a,subject_b,content,created_at")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function listReadingReports(userId: string): Promise<ReadingReportRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .select("id,user_id,mode,dual_type,status,subject_a,subject_b,content,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getReadingReport(id: string): Promise<ReadingReportRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .select("id,user_id,mode,dual_type,status,subject_a,subject_b,content,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function recoverStaleReadingReport(report: ReadingReportRow): Promise<ReadingReportRow> {
  if (report.status !== "generating") return report;
  const createdAt = Date.parse(report.createdAt);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt < READING_GENERATION_STALE_MS) return report;
  try {
    await updateReadingReport(report.id, { status: "failed", error: "READING_GENERATION_TIMEOUT" });
    return { ...report, status: "failed" };
  } catch {
    return report;
  }
}

export async function updateReadingReport(id: string, patch: { status: "ready" | "failed"; content?: unknown; error?: string | null }): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 分享接收:报告链接的登录非所有者打开时,把这份报告复制进 TA 的解读记录,
// 之后可从自己的记录反复查看。幂等去重按 用户+模式 拉取后在应用层深比较内容
// (PostgREST 对 jsonb 的对象等值过滤不可靠;两侧内容均为库内 jsonb,键序规范化一致)。
export async function importSharedReadingReport(viewerId: string, report: ReadingReportRow): Promise<string | null> {
  if (report.userId === viewerId || report.status !== "ready") return null;
  const admin = createSupabaseAdminClient();
  const { data: existingRows } = await admin.from("reading_reports")
    .select("id,content")
    .eq("user_id", viewerId)
    .eq("mode", report.mode);
  const duplicated = (existingRows ?? []).find((row) => JSON.stringify(row.content) === JSON.stringify(report.content));
  if (duplicated?.id) return duplicated.id as string;
  const { data, error } = await admin.from("reading_reports")
    .insert({
      user_id: viewerId,
      mode: report.mode,
      dual_type: report.dualType,
      subject_a: report.subjectA,
      subject_b: report.subjectB,
      status: "ready",
      content: report.content,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteReadingReport(id: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── 解读额度计费:次数包购买进 ledger,生成扣 1 次,失败自动退款(均按报告幂等) ──

// 生成前扣 1 次;余额不足时 PostgREST 报 INSUFFICIENT_CREDITS(路由层转 402)
export async function consumeReadingCredit(userId: string, reportId: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .rpc("consume_report_credit_for_reading", { p_user_id: userId, p_report_id: reportId });
  if (error) throw new Error(error.message);
}

// 生成失败退 1 次:幂等,未扣过费/已退过都是 no-op
export async function refundReadingCredit(userId: string, reportId: string): Promise<void> {
  await createSupabaseAdminClient()
    .rpc("refund_reading_credit", { p_user_id: userId, p_report_id: reportId });
}
