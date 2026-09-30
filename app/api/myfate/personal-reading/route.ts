import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { interpretBaziChart } from "../../../myfate-bazi-interpretation";
import { serializeBaziResult, parseBaziResult, type BaziReadingResult } from "../../../myfate-bazi-types";
import { resolveArea } from "../../../myfate-china-areas";
import { consumeReportCredit, getReportCredits } from "../../payments/epay/credits/server";

export const maxDuration = 120;

const today = new Date().toISOString().slice(0, 10);
const chartSchema = z.object({
  gender: z.enum(["male", "female"]),
  name: z.string().trim().max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => value >= "1900-01-01" && value <= today),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/u),
  birthDistrictCode: z.string().regex(/^\d{6}$/u),
});
const interpretSchema = z.object({ reportId: z.string().uuid() });

function chartCity(districtCode: string) {
  const area = resolveArea(districtCode);
  if (!area) return null;
  return { id: area.code, name: area.path.join(" "), lat: area.lat, lon: area.lon, tz: "Asia/Shanghai" };
}

// POST /api/myfate/personal-reading — 排盘并落库为待解读报告(不消耗额度)
export async function POST(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const parsed = chartSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const city = chartCity(parsed.data.birthDistrictCode);
    if (!city) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const chart = buildBaziChart({ ...parsed.data, city });
    const result: BaziReadingResult = {
      version: 5,
      name: parsed.data.name ?? "",
      headline: `你的日主是${chart.dayMaster}`,
      summary: "已完成排盘，尚未生成解读。",
      chart,
      gender: parsed.data.gender,
      sections: [],
      interpretationSource: "none",
    };
    const { data, error } = await createSupabaseAdminClient().from("myfate_reports").insert({
      user_id: session.user.id,
      star_id: "personal-reading",
      star_name: (parsed.data.name ?? "").trim() || `${parsed.data.birthDate} ${parsed.data.birthTime}`,
      star_portrait: "",
      status: "generating",
      score: 0,
      behavior_scores: null,
      question_count: null,
      initial_title: "个人解读",
      answers: [],
      interpretation: { reportText: serializeBaziResult(result) },
    }).select("id").single();
    if (error) throw error;
    return Response.json({ reportId: data.id, result }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to save bazi chart", error);
    return Response.json({ error: "READING_UNAVAILABLE" }, { status: 503 });
  }
}

// PUT /api/myfate/personal-reading — 对已排盘报告生成解读(此处消耗额度)
export async function PUT(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const parsed = interpretSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: row, error } = await supabase.from("myfate_reports")
      .select("id, user_id, interpretation, status")
      .eq("id", parsed.data.reportId)
      .eq("user_id", session.user.id)
      .eq("star_id", "personal-reading")
      .maybeSingle();
    if (error || !row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    const draft = parseBaziResult((row.interpretation as { reportText?: string } | null)?.reportText ?? null);
    if (!draft) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    if (draft.sections.length > 0) {
      // 已解读过:直接返回现有结果,不重复扣费
      return Response.json({ reportId: row.id, result: draft }, { status: 200, headers: session.headers });
    }

    if (await getReportCredits(session.user.id).catch(() => 0) < 1) {
      return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
    }
    const interpretation = await interpretBaziChart(draft.chart, draft.gender);
    const result: BaziReadingResult = {
      ...draft,
      headline: interpretation.headline,
      summary: interpretation.summary,
      sections: interpretation.sections,
      interpretationSource: interpretation.source,
    };
    const { error: updateError } = await supabase.from("myfate_reports").update({
      status: "advanced",
      interpretation: { reportText: serializeBaziResult(result) },
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (updateError) throw updateError;
    if (await consumeReportCredit(session.user.id) < 0) {
      // 极端并发下余额被并发扣尽:回滚到待解读状态
      await supabase.from("myfate_reports").update({
        status: "generating",
        interpretation: { reportText: serializeBaziResult(draft) },
      }).eq("id", row.id);
      return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
    }
    return Response.json({ reportId: row.id, result }, { status: 200, headers: session.headers });
  } catch (error) {
    console.error("Failed to interpret bazi chart", error);
    return Response.json({ error: "READING_UNAVAILABLE" }, { status: 503 });
  }
}
