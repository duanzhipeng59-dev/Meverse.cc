import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { getPublishedStar, getCelebrityVedicBirth, cacheCelebrityVedicChart, hasCelebrityVedicData } from "../../../myfate-stars-server";
import { analyzeThreePillars } from "../../../myfate-deep-analysis";
import { serializeFormulaResult, type ThreePillarCompositeResult } from "../../../myfate-generated-test-types";
import { serializeVedicResult, type VedicCompositeResult, type VedicChartSummary } from "../../../myfate-vedic-types";
import { computeVedicChart, computeVedicSynastry, vedicServiceConfigured, type VedicServiceChart } from "../../../myfate-vedic-client";
import { interpretVedicSynastry } from "../../../myfate-vedic-interpretation";
import { findVedicCity } from "../../../myfate-cities";
import { mapReportRow, type ReportRow } from "../reports/server";

export const maxDuration = 300;

const today = new Date().toISOString().slice(0, 10);
const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => value >= "1900-01-01" && value <= today),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/u).optional(),
  birthCityId: z.string().max(60).optional(),
});

function dimensionTendency(value: number, description: string) {
  return {
    tendency: (value >= 78 ? "自然协同" : value >= 63 ? "彼此互补" : "需要磨合") as "自然协同" | "彼此互补" | "需要磨合",
    description,
  };
}

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

    // Vedic flow requires: service configured + user time/city + celebrity vedic data.
    let vedic: VedicCompositeResult | null = null;
    if (vedicServiceConfigured() && parsed.data.birthTime && parsed.data.birthCityId) {
      try {
        vedic = await buildVedicResult({
          starId: star.id,
          starName: star.name,
          birthDate: parsed.data.birthDate,
          birthTime: parsed.data.birthTime,
          cityId: parsed.data.birthCityId,
        });
      } catch (error) {
        console.error("Vedic composite failed, falling back to three pillars", error);
      }
    }

    if (vedic) {
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
      return Response.json({ report: mapReportRow(data as ReportRow), result: vedic, mode: "vedic" }, { status: 201, headers: session.headers });
    }

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
    const vedicAvailable = await hasCelebrityVedicData(star.id).catch(() => false);
    return Response.json({ report: mapReportRow(data as ReportRow), result, vedicAvailable }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Failed to create composite analysis", error);
    return Response.json({ error: "COMPOSITE_UNAVAILABLE" }, { status: 503 });
  }
}
