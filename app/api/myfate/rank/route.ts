import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { jsonResponse } from "../../payments/epay/server";
import { computeVedicChart, vedicServiceConfigured, type VedicServiceChart } from "../../../myfate-vedic-client";
import { getPublishedStars } from "../../../myfate-stars-server";
import { resolveArea } from "../../../myfate-china-areas";
import { z } from "zod";

export const maxDuration = 300;

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/u),
  birthDistrictCode: z.string().regex(/^\d{6}$/u),
});

type CelebrityVedicRow = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_lat: number;
  birth_lon: number;
  birth_tz: string;
  vedic_chart: { structuredMd: string; summary: Record<string, unknown> } | null;
};

export async function POST(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    if (!vedicServiceConfigured()) return jsonResponse({ error: "service_unavailable" }, { status: 503 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonResponse({ error: "invalid_request" }, { status: 400 });
    const area = resolveArea(parsed.data.birthDistrictCode);
    if (!area) return jsonResponse({ error: "invalid_request" }, { status: 400 });

    const userChart = await computeVedicChart({
      name: "用户",
      date: parsed.data.birthDate,
      time: parsed.data.birthTime,
      lat: area.lat,
      lon: area.lon,
      tz: "Asia/Shanghai",
    });

    const supabase = createSupabaseAdminClient();
    const [{ data: celebRows }, stars] = await Promise.all([
      supabase.from("celebrity_profiles")
        .select("id,name,birth_date,birth_time,birth_lat,birth_lon,birth_tz,vedic_chart")
        .eq("published", true)
        .not("birth_time", "is", null) as unknown as { data: CelebrityVedicRow[] | null },
      getPublishedStars(),
    ]);
    const rows = (celebRows ?? []) as CelebrityVedicRow[];
    if (!rows.length) return jsonResponse({ error: "no_targets" }, { status: 503 });

    // Reuse cached charts; compute any missing ones (bounded).
    const targets: Array<{ id: string; structuredMd: string; name: string }> = [];
    const missing: CelebrityVedicRow[] = [];
    for (const row of rows) {
      if (row.vedic_chart?.structuredMd) {
        targets.push({ id: row.id, structuredMd: row.vedic_chart.structuredMd, name: row.name });
      } else {
        missing.push(row);
      }
    }
    for (const row of missing.slice(0, 60)) {
      try {
        const chart: VedicServiceChart = await computeVedicChart({
          name: row.name, date: row.birth_date, time: row.birth_time, lat: row.birth_lat, lon: row.birth_lon, tz: row.birth_tz,
        });
        targets.push({ id: row.id, structuredMd: chart.structuredMd, name: row.name });
        await supabase.from("celebrity_profiles")
          .update({ vedic_chart: { structuredMd: chart.structuredMd, summary: chart.summary } })
          .eq("id", row.id);
      } catch (error) {
        console.error("rank chart compute failed", row.id, error);
      }
    }

    const serviceBase = (process.env.VEDIC_SERVICE_URL ?? "").replace(/\/$/u, "");
    const token = process.env.VEDIC_SERVICE_TOKEN;
    const rankResponse = await fetch(`${serviceBase}/rank`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { "x-vedic-token": token } : {}) },
      body: JSON.stringify({ structuredMd: userChart.structuredMd, targets, nameA: "用户" }),
      signal: AbortSignal.timeout(280_000),
    });
    if (!rankResponse.ok) throw new Error(`RANK_HTTP_${rankResponse.status}`);
    const rankData = await rankResponse.json() as { results: Array<{ id: string; score: number; resonance: number; kootaPositive: number }> };

    const nameById = new Map(stars.map(star => [star.id, star] as const));
    const ranking = rankData.results.map(result => {
      const star = nameById.get(result.id);
      return {
        starId: result.id,
        name: star?.name ?? result.id,
        portraitSrc: star?.portraitSrc ?? "",
        role: star?.role ?? "",
        score: result.score,
        resonance: result.resonance,
      };
    }).filter(item => item.name);

    return jsonResponse({ ranking });
  } catch (error) {
    console.error("Failed to rank composites", error);
    return jsonResponse({ error: "rank_unavailable" }, { status: 503 });
  }
}
