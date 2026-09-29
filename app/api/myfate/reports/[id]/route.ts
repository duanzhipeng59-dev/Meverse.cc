import { z } from "zod";
import { createSupabaseAdminClient } from "../../../auth/server";
import { mapReportRow, requireReportUser, type ReportRow } from "../server";

const updateSchema = z.object({
  status: z.enum(["initial", "generating", "advanced"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  reportText: z.string().min(1).max(100000).nullable().optional(),
  interpretation: z.record(z.string(), z.unknown()).nullable().optional(),
  interpretationSource: z.enum(["deepseek", "gemini"]).nullable().optional(),
  questionCount: z.number().int().min(1).max(64).optional(),
  answers: z.array(z.object({
    question: z.string().max(500),
    options: z.array(z.string().min(1).max(500)).min(1).max(12).optional(),
    answer: z.string().max(500),
  })).max(64).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "login_required" }, { status: 401 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "invalid_report_update" }, { status: 400 });
    const patch = {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.score !== undefined ? { score: parsed.data.score } : {}),
      ...(parsed.data.reportText !== undefined
        ? { interpretation: parsed.data.reportText === null ? null : { reportText: parsed.data.reportText } }
        : parsed.data.interpretation !== undefined ? { interpretation: parsed.data.interpretation } : {}),
      ...(parsed.data.interpretationSource !== undefined ? { interpretation_source: parsed.data.interpretationSource } : {}),
      ...(parsed.data.questionCount !== undefined ? { question_count: parsed.data.questionCount } : {}),
      ...(parsed.data.answers !== undefined ? { answers: parsed.data.answers } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await createSupabaseAdminClient()
      .from("myfate_reports")
      .update(patch)
      .eq("id", (await context.params).id)
      .eq("user_id", session.user.id)
      .select("id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "report_not_found" }, { status: 404 });
    return Response.json({ report: mapReportRow(data as ReportRow) }, { headers: session.headers });
  } catch (error) {
    console.error("Failed to update Myfate report", error);
    return Response.json({ error: "report_update_failed" }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "login_required" }, { status: 401 });
    const { data, error } = await createSupabaseAdminClient()
      .from("myfate_reports")
      .delete()
      .eq("id", (await context.params).id)
      .eq("user_id", session.user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "report_not_found" }, { status: 404 });
    return new Response(null, { status: 204, headers: session.headers });
  } catch (error) {
    console.error("Failed to delete Myfate report", error);
    return Response.json({ error: "report_delete_failed" }, { status: 503 });
  }
}
