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
  status: "generating" | "ready" | "failed";
  subjectA: ReadingSubject;
  subjectB: ReadingSubject | null;
  content: unknown;
  createdAt: string;
};

// 后台任务被平台中断时没有机会回写状态，避免历史记录永久停在「生成中」。
export const READING_GENERATION_STALE_MS = 15 * 60 * 1000;

function mapRow(row: Record<string, unknown>): ReadingReportRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as "single" | "dual",
    dualType: (row.dual_type === "career" ? "career" : "love"),
    status: (row.status === "ready" || row.status === "failed" ? row.status : "generating") as ReadingReportRow["status"],
    subjectA: row.subject_a as ReadingSubject,
    subjectB: (row.subject_b ?? null) as ReadingSubject | null,
    content: row.content ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createReadingReport(input: { userId: string; mode: "single" | "dual"; dualType?: "love" | "career"; subjectA: ReadingSubject; subjectB?: ReadingSubject | null }): Promise<string> {
  const { data, error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .insert({ user_id: input.userId, mode: input.mode, dual_type: input.dualType ?? "love", subject_a: input.subjectA, subject_b: input.subjectB ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listReadingReports(userId: string): Promise<ReadingReportRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .select("id,user_id,mode,dual_type,status,subject_a,subject_b,content,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
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

export async function deleteReadingReport(id: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("reading_reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
