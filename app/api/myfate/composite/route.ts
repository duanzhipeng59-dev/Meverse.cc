import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { getPublishedStar, getCelebrityVedicBirth, cacheCelebrityVedicChart } from "../../../myfate-stars-server";
import { serializeVedicResult, type VedicCompositeResult, type VedicChartSummary } from "../../../myfate-vedic-types";
import { computeVedicChart, computeVedicSynastry, vedicServiceConfigured, type VedicServiceChart } from "../../../myfate-vedic-client";
import { interpretVedicSynastry } from "../../../myfate-vedic-interpretation";
import { findVedicCity } from "../../../myfate-cities";
import { consumeReportCredit, getReportCredits } from "../../payments/epay/credits/server";
import { mapReportRow, type ReportRow } from "../reports/server";

export const maxDuration = 300;

const today = new Date().toISOString().slice(0, 10);
const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => value >= "1900-01-01" && value <= today),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/u),
  birthCityId: z.string().min(1).max(60),
});

function chartSummary(chart: VedicServiceChart, name: string): VedicChartSummary {
  const s = chart.summary;
  return {
    name,
    lagna: s.lagna,
    lagnaNakshatra: s.lagnaNakshatra,
    moonSign: s.moonSign,
    moonNakshatra: s.moonNakshatra,
    moonPada: s.moonPada,
    sunSign: s.sunSign,
    venusSign: s.venusSign,
    marsSign: s.marsSign,
    jupiterSign: s.jupiterSign,
    saturnSign: s.saturnSign,
  };
}

async function buildVedicResult(input: {
  starId: string;
  starName: string;
  birthDate: string;
  birthTime: string;
  cityId: string;
}): Promise<VedicCompositeResult> {
  const city = findVedicCity(input.cityId);
  if (!city) throw new Error("INVALID_CITY");

  const starBirth = await getCelebrityVedicBirth(input.starId);
  if (!starBirth) throw new Error("STAR_VEDIC_UNAVAILABLE");

  const [userChart, starChart] = await Promise.all([
    computeVedicChart({ name: "用户", date: input.birthDate, time: input.birthTime, lat: city.lat, lon: city.lon, tz: city.tz }),
    starBirth.cachedChartMd && starBirth.cachedChartSummary
      ? Promise.resolve({ structuredMd: starBirth.cachedChartMd, summary: starBirth.cachedChartSummary as unknown as VedicServiceChart["summary"] })
      : computeVedicChart({ name: starBirth.name, date: starBirth.birthDate, time: starBirth.birthTime, lat: starBirth.lat, lon: starBirth.lon, tz: starBirth.tz })
        .then(async (chart) => {
          await cacheCelebrityVedicChart(input.starId, chart.structuredMd, chart.summary as unknown as Record<string, unknown>).catch(() => undefined);
          return chart;
        }),
  ]);

  const synastry = await computeVedicSynastry(userChart.structuredMd, starChart.structuredMd, "用户", input.starName);
  const { interpretation, source } = await interpretVedicSynastry(chartSummary(userChart, "你"), chartSummary(starChart, input.starName), synastry, input.starName);

  return {
    version: 4,
    starId: input.starId,
    mode: "vedic",
    headline: interpretation.headline,
    insight: interpretation.insight,
    tension: interpretation.tension,
    relationshipType: interpretation.relationshipType,
    relationshipSummary: interpretation.relationshipSummary,
    userChart: chartSummary(userChart, "你"),
    starChart: chartSummary(starChart, input.starName),
    dimensions: interpretation.dimensions,
    ashtakoota: synastry.sections.ashtakoota,
    overlayHighlights: {
      userToStar: synastry.sections.overlayAToB,
      starToUser: synastry.sections.overlayBToA,
    },
    timingNotes: interpretation.timingNotes,
    interpretationSource: source,
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
    if (!vedicServiceConfigured()) {
      console.error("Vedic composite unavailable: VEDIC_SERVICE_URL not configured");
      return Response.json({ error: "COMPOSITE_UNAVAILABLE" }, { status: 503 });
    }
    if (await getReportCredits(session.user.id).catch(() => 0) < 1) {
      return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
    }

    let vedic: VedicCompositeResult;
    try {
      vedic = await buildVedicResult({
        starId: star.id,
        starName: star.name,
        birthDate: parsed.data.birthDate,
        birthTime: parsed.data.birthTime,
        cityId: parsed.data.birthCityId,
      });
    } catch (error) {
      console.error("Vedic composite failed", error);
      return Response.json({ error: "COMPOSITE_UNAVAILABLE" }, { status: 503 });
    }

    const { data, error } = await createSupabaseAdminClient().from("myfate_reports").insert({
      user_id: session.user.id,
      star_id: star.id,
      star_name: star.name,
      star_portrait: star.portraitSrc,
      status: "advanced",
      score: 0,
      behavior_scores: null,
      question_count: null,
      initial_title: "吠陀合盘分析",
      answers: [],
      interpretation: { reportText: serializeVedicResult(vedic) },
      interpretation_source: "deepseek",
    }).select("id, star_id, star_name, star_portrait, status, score, behavior_scores, question_count, initial_title, answers, interpretation, interpretation_source, created_at, updated_at").single();
    if (error) throw error;
    if (await consumeReportCredit(session.user.id) < 0) {
      await createSupabaseAdminClient().from("myfate_reports").delete().eq("id", data.id);
      return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
    }
    return Response.json({ report: mapReportRow(data as ReportRow), result: vedic, mode: "vedic" }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to create vedic composite", error);
    return Response.json({ error: "COMPOSITE_UNAVAILABLE" }, { status: 503 });
  }
}
