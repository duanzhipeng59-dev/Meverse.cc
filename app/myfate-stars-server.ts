import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "./api/auth/server";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildStarBaziBrief, buildStarBaziHeadline } from "./myfate-star-bazi-report";
import { createDefaultCelebrityReportPrompt, getStar, stars, type StarProfile } from "./myfate-data";

type CelebrityRow = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  description: string;
  relationship_style: string;
  focus: string;
  mbti: string;
  birth_date: string;
  three_pillars: string;
  traits: string[];
  categories: string[];
  match_count: number;
  portrait_url: string;
  ideal: StarProfile["ideal"] & { _reportPrompt?: string };
  report_prompt?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lon?: number | null;
  birth_tz?: string | null;
  gender?: "male" | "female" | "other" | "unknown" | null;
  vedic_chart?: { structuredMd: string; summary: Record<string, unknown> } | null;
};

export type CelebrityVedicBirth = {
  starId: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  lat: number;
  lon: number;
  tz: string;
  gender: "male" | "female" | "other" | "unknown";
  cachedChartMd: string | null;
  cachedChartSummary: Record<string, unknown> | null;
};

const profileSelection = "id,name,role,tagline,description,relationship_style,focus,mbti,birth_date,three_pillars,traits,categories,match_count,portrait_url,ideal";
const reportSelection = `${profileSelection},report_prompt`;

function hasCloudConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function mapCelebrity(row: CelebrityRow): StarProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    tagline: row.tagline,
    description: row.description,
    relationshipStyle: row.relationship_style,
    focus: row.focus,
    mbti: row.mbti,
    birthDate: row.birth_date,
    threePillars: row.three_pillars,
    traits: row.traits,
    categories: row.categories,
    matchCount: String(row.match_count),
    portraitSrc: row.portrait_url,
    ideal: {
      security: row.ideal.security,
      expression: row.ideal.expression,
      independence: row.ideal.independence,
      conflict: row.ideal.conflict,
      novelty: row.ideal.novelty,
    },
  };
}

function reportPromptForRow(row: CelebrityRow) {
  const star = mapCelebrity(row);
  return row.report_prompt?.trim() || row.ideal?._reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star);
}

export async function getPublishedStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("published", true)
      .order("workspace_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
  } catch (error) {
    console.error("Failed to read published celebrity profiles", error);
    return stars;
  }
}

export async function getHomepageStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("published", true)
      .eq("homepage_featured", true)
      .order("homepage_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
  } catch (error) {
    console.error("Failed to read homepage celebrity profiles", error);
    return stars;
  }
}

export async function getPublishedStar(id: string): Promise<StarProfile | undefined> {
  if (!hasCloudConfig()) return getStar(id);
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCelebrity(data as unknown as CelebrityRow) : undefined;
  } catch (error) {
    console.error("Failed to read celebrity profile", error);
    return getStar(id);
  }
}

export async function getCelebrityReportPrompt(id: string): Promise<string | undefined> {  if (!hasCloudConfig()) {
    const star = getStar(id);
    return star ? star.reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star) : undefined;
  }
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(reportSelection)
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? reportPromptForRow(data as unknown as CelebrityRow) : undefined;
  } catch (error) {
    console.error("Failed to read celebrity report prompt", error);
    const star = getStar(id);
    return star ? star.reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star) : undefined;
  }
}

const vedicSelection = "id,name,birth_date,birth_time,birth_place,birth_lat,birth_lon,birth_tz,gender,vedic_chart";

export async function getCelebrityVedicBirth(id: string): Promise<CelebrityVedicBirth | undefined> {
  noStore();
  const { data, error } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select(vedicSelection)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const row = data as CelebrityRow;
  if (!row.birth_time || row.birth_lat == null || row.birth_lon == null || !row.birth_tz) return undefined;
  return {
    starId: row.id,
    name: row.name,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place ?? "",
    lat: row.birth_lat,
    lon: row.birth_lon,
    tz: row.birth_tz,
    gender: row.gender ?? "unknown",
    cachedChartMd: row.vedic_chart?.structuredMd ?? null,
    cachedChartSummary: row.vedic_chart?.summary ?? null,
  };
}

export async function cacheCelebrityVedicChart(id: string, structuredMd: string, summary: Record<string, unknown>) {
  await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .update({ vedic_chart: { structuredMd, summary } })
    .eq("id", id);
}

// 详情页八字文案:标题下的一句命理印象 + 按钮上方的梗概,按出生资料实时排盘生成。
export async function getStarBaziBrief(id: string): Promise<{ headline: string; brief: string }> {
  try {
    const birth = await getCelebrityVedicBirth(id);
    if (!birth) return { headline: "", brief: "" };
    const chart = buildBaziChart({
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      gender: birth.gender === "female" ? "female" : "male",
      city: { id: birth.starId, name: birth.birthPlace || "首尔", lat: birth.lat, lon: birth.lon, tz: birth.tz },
    });
    return { headline: buildStarBaziHeadline(chart), brief: buildStarBaziBrief(chart) };
  } catch (error) {
    console.error("Failed to build star bazi brief", error);
    return { headline: "", brief: "" };
  }
}

// 是否已解锁过该明星的报告(付费模式下重看免费)。
export async function hasStarReportView(userId: string, starId: string): Promise<boolean> {
  try {
    const { data } = await createSupabaseAdminClient()
      .from("star_report_views")
      .select("star_id")
      .eq("user_id", userId)
      .eq("star_id", starId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

// 浏览记录:打开明星正缘报告时原子计数。
export async function recordStarReportView(userId: string, starId: string) {
  try {
    await createSupabaseAdminClient().rpc("record_star_report_view", { p_user_id: userId, p_star_id: starId });
  } catch (error) {
    console.error("Failed to record star report view", error);
  }
}

export type StarReportView = {
  starId: string;
  name: string;
  role: string;
  portraitSrc: string;
  viewCount: number;
  lastViewedAt: string;
};

export async function getStarReportViews(userId: string): Promise<StarReportView[]> {
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("star_report_views")
      .select("star_id, view_count, last_viewed_at, celebrity_profiles!inner(name, role, portrait_url, published)")
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return ((data ?? []) as unknown as Array<{
      star_id: string;
      view_count: number;
      last_viewed_at: string;
      celebrity_profiles: { name: string; role: string; portrait_url: string; published: boolean } | null;
    }>)
      .filter((row) => row.celebrity_profiles?.published)
      .map((row) => ({
        starId: row.star_id,
        name: row.celebrity_profiles!.name,
        role: row.celebrity_profiles!.role,
        portraitSrc: row.celebrity_profiles!.portrait_url,
        viewCount: row.view_count,
        lastViewedAt: row.last_viewed_at,
      }));
  } catch (error) {
    console.error("Failed to read star report views", error);
    return [];
  }
}

export async function incrementStarMatchCount(id: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("celebrity_profiles").select("match_count").eq("id", id).maybeSingle();
  if (error || !data) return;
  await client
    .from("celebrity_profiles")
    .update({ match_count: ((data as { match_count: number }).match_count ?? 0) + 1 })
    .eq("id", id);
}

export async function hasCelebrityVedicData(id: string): Promise<boolean> {
  noStore();
  const { data } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select("id")
    .eq("id", id)
    .eq("published", true)
    .not("birth_time", "is", null)
    .not("birth_lat", "is", null)
    .not("birth_tz", "is", null)
    .maybeSingle();
  return Boolean(data);
}

export type StarVedicSummary = {
  lagna: string;
  lagnaNakshatra: string;
  moonSign: string;
  moonNakshatra: string;
  moonPada: number;
  sunSign: string;
};

export async function getStarVedicSummary(id: string): Promise<StarVedicSummary | null> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select("vedic_chart")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const summary = (data as { vedic_chart?: { summary?: Record<string, unknown> } | null }).vedic_chart?.summary;
    if (!summary) return null;
    const pick = (key: string) => (typeof summary[key] === "string" ? (summary[key] as string) : "");
    const lagna = pick("lagna");
    const moonSign = pick("moonSign");
    if (!lagna || !moonSign) return null;
    return {
      lagna,
      lagnaNakshatra: pick("lagnaNakshatra"),
      moonSign,
      moonNakshatra: pick("moonNakshatra"),
      moonPada: typeof summary.moonPada === "number" ? summary.moonPada : 1,
      sunSign: pick("sunSign"),
    };
  } catch {
    return null;
  }
}
