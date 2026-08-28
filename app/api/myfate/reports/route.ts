import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { getPublishedStar } from "../../../myfate-stars-server";
import { mapReportRow, requireReportUser, type ReportRow } from "./server";

const answerSchema = z.object({
  question: z.string().max(500),
  options: z.array(z.string().min(1).max(500)).min(1).max(12).optional(),
  answer: z.string().max(500),
});
const createSchema = z.object({
  starId: z.string().max(80),
  questionCount: z.number().int().min(1).max(64).optional(),
  answers: z.array(answerSchema).max(64),
  initialTitle: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "login_required", reports: [] }, { status: 401 });
    const starId = new URL(request.url).searchParams.get("starId")?.slice(0, 80);
    let query = createSupabaseAdminClient()
      .from("myfate_reports")
      .select("id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (starId) query = query.eq("star_id", starId).limit(1);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ reports: ((data ?? []) as ReportRow[]).map(mapReportRow) }, { headers: session.headers });
  } catch (error) {
    console.error("Failed to read Myfate reports", error);
    return Response.json({ error: "reports_unavailable", reports: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "login_required" }, { status: 401 });
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "invalid_report" }, { status: 400 });
    const star = await getPublishedStar(parsed.data.starId);
    if (!star) return Response.json({ error: "star_not_found" }, { status: 404 });
    const { data, error } = await createSupabaseAdminClient()
      .from("myfate_reports")
      .insert({
        user_id: session.user.id,
        star_id: star.id,
        star_name: star.name,
        star_portrait: star.portraitSrc,
        status: "generating",
        score: 0,
        behavior_scores: null,
        question_count: parsed.data.questionCount ?? null,
        initial_title: parsed.data.initialTitle ?? "AI 报告",
        answers: parsed.data.answers,
      })
      .select("id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at")
      .single();
    if (error) throw error;
    return Response.json({ report: mapReportRow(data as ReportRow) }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to create Myfate report", error);
    return Response.json({ error: "report_create_failed" }, { status: 503 });
  }
}
