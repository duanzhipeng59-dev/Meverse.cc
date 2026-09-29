import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { interpretBaziChart } from "../../../myfate-bazi-interpretation";
import { serializeBaziResult, type BaziReadingResult } from "../../../myfate-bazi-types";
import { findVedicCity } from "../../../myfate-cities";
import { mapReportRow, type ReportRow } from "../reports/server";

export const maxDuration = 120;

const today = new Date().toISOString().slice(0, 10);
const requestSchema = z.object({
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => value >= "1900-01-01" && value <= today),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/u),
  birthCityId: z.string().min(1).max(60),
});

const REPORT_SELECT = "id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at";

export async function POST(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const city = findVedicCity(parsed.data.birthCityId);
    if (!city) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const chart = buildBaziChart({ ...parsed.data, city });
    const interpretation = await interpretBaziChart(chart, parsed.data.gender);
    const result: BaziReadingResult = {
      version: 5,
      headline: interpretation.headline,
      summary: interpretation.summary,
      chart,
      gender: parsed.data.gender,
      sections: interpretation.sections,
      interpretationSource: interpretation.source,
    };

    const { data, error } = await createSupabaseAdminClient().from("myfate_reports").insert({
      user_id: session.user.id,
      star_id: "personal-reading",
      star_name: "个人八字解读",
      star_portrait: "",
      status: "advanced",
      score: 0,
      behavior_scores: null,
      question_count: null,
      initial_title: "个人解读",
      answers: [],
      interpretation: { reportText: serializeBaziResult(result) },
      interpretation_source: "deepseek",
    }).select(REPORT_SELECT).single();
    if (error) throw error;
    return Response.json({ report: mapReportRow(data as ReportRow), result }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to create personal reading", error);
    return Response.json({ error: "READING_UNAVAILABLE" }, { status: 503 });
  }
}
