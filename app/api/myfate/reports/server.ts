import type { SavedReport } from "../../../myfate-report-storage";
import { appendSessionCookies, getSessionUser } from "../../auth/server";

export type ReportRow = {
  id: string;
  star_id: string;
  star_name: string;
  star_portrait: string;
  status: SavedReport["status"];
  score: number;
  behavior_scores: SavedReport["behaviorScores"] | null;
  question_count: number | null;
  initial_title: string;
  answers: SavedReport["answers"];
  interpretation: SavedReport["interpretation"];
  interpretation_source: SavedReport["interpretationSource"] | null;
  created_at: string;
  updated_at: string;
};

export function mapReportRow(row: ReportRow): SavedReport {
  const generationMarker = typeof row.interpretation === "object" && row.interpretation !== null
    ? row.interpretation as Record<string, unknown>
    : null;
  const reportText = typeof row.interpretation === "object" && row.interpretation !== null
    && "reportText" in row.interpretation && typeof row.interpretation.reportText === "string"
    ? row.interpretation.reportText
    : null;
  return {
    id: row.id,
    version: 1,
    type: "celebrity-match",
    starId: row.star_id,
    starName: row.star_name,
    starPortrait: row.star_portrait,
    status: row.status,
    score: row.score,
    behaviorScores: row.behavior_scores ?? undefined,
    questionCount: row.question_count ?? undefined,
    initialTitle: row.initial_title,
    answers: row.answers,
    interpretation: row.interpretation,
    reportText,
    interpretationSource: row.interpretation_source ?? undefined,
    generatedTestId: typeof generationMarker?.generatedTestId === "string" ? generationMarker.generatedTestId : undefined,
    testGenerationFailed: generationMarker?.generationError === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function requireReportUser(request: Request) {
  const session = await getSessionUser(request);
  if (!session.user?.id) return null;
  const headers = new Headers();
  if (session.refreshedSession) appendSessionCookies(headers, session.refreshedSession, request);
  return { user: session.user, headers };
}
