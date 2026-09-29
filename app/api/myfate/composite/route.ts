import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { getPublishedStar } from "../../../myfate-stars-server";
import { analyzeThreePillars } from "../../../myfate-deep-analysis";
import { serializeFormulaResult, type ThreePillarCompositeResult } from "../../../myfate-generated-test-types";
import { mapReportRow, type ReportRow } from "../reports/server";

const today = new Date().toISOString().slice(0, 10);
const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => value >= "1900-01-01" && value <= today),
});

function dimensionTendency(value: number, description: string) {
  return {
    tendency: (value >= 78 ? "自然协同" : value >= 63 ? "彼此互补" : "需要磨合") as "自然协同" | "彼此互补" | "需要磨合",
    description,
  };
}

export async function POST(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const star = await getPublishedStar(parsed.data.starId);
    if (!star) return Response.json({ error: "CELEBRITY_NOT_FOUND" }, { status: 404 });
    const analysis = analyzeThreePillars(parsed.data.birthDate, star.threePillars);
    if (!analysis) return Response.json({ error: "COMPOSITE_FAILED" }, { status: 422 });
    const result: ThreePillarCompositeResult = {
      version: 3,
      starId: star.id,
      userThreePillars: analysis.userThreePillars,
      starThreePillars: analysis.starThreePillars,
      headline: analysis.headline,
      insight: analysis.insight,
      tension: analysis.tension,
      dimensions: [
        { label: "亲密回应", ...dimensionTendency(analysis.intimacyScore, "双方表达亲近与接住情绪的自然程度") },
        { label: "日常节奏", ...dimensionTendency(analysis.dailyScore, "双方在生活安排与相处步调上的关系倾向") },
        { label: "外在协作", ...dimensionTendency(analysis.externalScore, "双方共同面对外部任务时的配合方式") },
        { label: "整体结构", ...dimensionTendency(analysis.structureScore, "双方三柱之间合、冲、刑、害形成的整体关系") },
      ],
    };
    const { data, error } = await createSupabaseAdminClient().from("myfate_reports").insert({
      user_id: session.user.id,
      star_id: star.id,
      star_name: star.name,
      star_portrait: star.portraitSrc,
      status: "advanced",
      score: 0,
      behavior_scores: null,
      question_count: null,
      initial_title: "三柱合盘分析",
      answers: [],
      interpretation: { reportText: serializeFormulaResult(result) },
    }).select("id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at").single();
    if (error) throw error;
    return Response.json({ report: mapReportRow(data as ReportRow), result }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to create three-pillar composite", error);
    return Response.json({ error: "COMPOSITE_UNAVAILABLE" }, { status: 503 });
  }
}
