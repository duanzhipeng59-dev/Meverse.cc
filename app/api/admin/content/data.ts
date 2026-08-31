import { createSupabaseAdminClient } from "../../auth/server";

export type AdminCelebrity = {
  id: string;
  name: string;
  nameEn: string;
  nameZh: string;
  gender: "female" | "male" | "other" | "unknown";
  role: string;
  tagline: string;
  description: string;
  relationshipStyle: string;
  focus: string;
  mbti: string;
  birthDate: string;
  deathDate: string;
  mbtiSourceType: "self_reported" | "biographical_inference" | "unknown";
  mbtiConfidence: "high" | "medium" | "low" | "unknown";
  birthDateConfidence: "high" | "medium" | "low" | "unknown";
  isHistoricalFigure: boolean;
  isDeceased: boolean;
  portraitRisk: "low" | "medium" | "high" | "unknown";
  commercialDemoRisk: "low" | "medium" | "high" | "unknown";
  enableBazi: boolean;
  enableMbti: boolean;
  recommendationLevel: number | null;
  threePillars: string;
  traits: string[];
  categories: string[];
  portraitUrl: string;
  reportPrompt: string;
  published: boolean;
  workspacePosition: number | null;
  homepageFeatured: boolean;
  homepagePosition: number | null;
};

export type AdminCelebritySummary = Pick<AdminCelebrity,
  "id" | "name" | "nameEn" | "nameZh" | "mbti" | "portraitUrl" |
  "published" | "workspacePosition" | "homepageFeatured" | "homepagePosition" |
  "isHistoricalFigure" | "recommendationLevel"
>;

type CelebrityRow = {
  id: string;
  name: string;
  name_en: string | null;
  name_zh: string | null;
  gender: AdminCelebrity["gender"] | null;
  role: string;
  tagline: string;
  description: string;
  relationship_style: string;
  focus: string;
  mbti: string;
  birth_date: string;
  death_date: string | null;
  mbti_source_type: AdminCelebrity["mbtiSourceType"] | null;
  mbti_confidence: AdminCelebrity["mbtiConfidence"] | null;
  birth_date_confidence: AdminCelebrity["birthDateConfidence"] | null;
  is_historical_figure: boolean | null;
  is_deceased: boolean | null;
  portrait_risk: AdminCelebrity["portraitRisk"] | null;
  commercial_demo_risk: AdminCelebrity["commercialDemoRisk"] | null;
  enable_bazi: boolean | null;
  enable_mbti: boolean | null;
  recommendation_level: number | null;
  three_pillars: string;
  traits: string[] | null;
  categories: string[] | null;
  portrait_url: string;
  ideal: Record<string, unknown> | null;
  report_prompt: string | null;
  published: boolean;
  workspace_position: number | null;
  homepage_featured: boolean;
  homepage_position: number | null;
};

function mapCelebrity(row: CelebrityRow): AdminCelebrity {
  const embeddedPrompt = typeof row.ideal?._reportPrompt === "string" ? row.ideal._reportPrompt : "";
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? row.name,
    nameZh: row.name_zh ?? "",
    gender: row.gender ?? "unknown",
    role: row.role,
    tagline: row.tagline,
    description: row.description,
    relationshipStyle: row.relationship_style,
    focus: row.focus,
    mbti: row.mbti,
    birthDate: row.birth_date,
    deathDate: row.death_date ?? "",
    mbtiSourceType: row.mbti_source_type ?? "unknown",
    mbtiConfidence: row.mbti_confidence ?? "unknown",
    birthDateConfidence: row.birth_date_confidence ?? "unknown",
    isHistoricalFigure: row.is_historical_figure ?? false,
    isDeceased: row.is_deceased ?? false,
    portraitRisk: row.portrait_risk ?? "unknown",
    commercialDemoRisk: row.commercial_demo_risk ?? "unknown",
    enableBazi: row.enable_bazi ?? true,
    enableMbti: row.enable_mbti ?? true,
    recommendationLevel: row.recommendation_level,
    threePillars: row.three_pillars,
    traits: row.traits ?? [],
    categories: row.categories ?? [],
    portraitUrl: row.portrait_url,
    reportPrompt: row.report_prompt?.trim() || embeddedPrompt,
    published: row.published,
    workspacePosition: row.workspace_position,
    homepageFeatured: row.homepage_featured,
    homepagePosition: row.homepage_position,
  };
}

type CelebritySummaryRow = Pick<CelebrityRow,
  "id" | "name" | "name_en" | "name_zh" | "mbti" | "portrait_url" |
  "published" | "workspace_position" | "homepage_featured" | "homepage_position" |
  "is_historical_figure" | "recommendation_level"
>;

function mapCelebritySummary(row: CelebritySummaryRow): AdminCelebritySummary {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? row.name,
    nameZh: row.name_zh ?? "",
    mbti: row.mbti,
    portraitUrl: row.portrait_url,
    published: row.published,
    workspacePosition: row.workspace_position,
    homepageFeatured: row.homepage_featured,
    homepagePosition: row.homepage_position,
    isHistoricalFigure: row.is_historical_figure ?? false,
    recommendationLevel: row.recommendation_level,
  };
}

export async function loadAdminContent() {
  const supabase = createSupabaseAdminClient();
  const celebrityResult = await supabase
    .from("celebrity_profiles")
    .select("id,name,name_en,name_zh,mbti,portrait_url,published,workspace_position,homepage_featured,homepage_position,is_historical_figure,recommendation_level")
    .order("workspace_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (celebrityResult.error) throw celebrityResult.error;
  return {
    celebrities: ((celebrityResult.data ?? []) as unknown as CelebritySummaryRow[]).map(mapCelebritySummary),
  };
}

export async function loadAdminCelebrity(id: string): Promise<AdminCelebrity | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCelebrity(data as unknown as CelebrityRow) : null;
}

async function updateOrderInBatches(rows: Array<{ id: string; position: number }>) {
  const supabase = createSupabaseAdminClient();
  const updatedAt = new Date().toISOString();
  for (let start = 0; start < rows.length; start += 8) {
    const batch = rows.slice(start, start + 8);
    await Promise.all(batch.map(async (row) => {
      const { error } = await supabase
        .from("celebrity_profiles")
        .update({ workspace_position: row.position, updated_at: updatedAt })
        .eq("id", row.id);
      if (error) throw error;
    }));
  }
}

export async function normalizeCelebrityOrder() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("celebrity_profiles")
    .select("id,workspace_position,created_at")
    .order("workspace_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const changed = (data ?? []).flatMap((row, index) => row.workspace_position === index + 1
    ? []
    : [{ id: row.id, position: index + 1 }]);
  await updateOrderInBatches(changed);
}

export async function moveCelebrity(id: string, requestedPosition: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("celebrity_profiles")
    .select("id,workspace_position,created_at")
    .order("workspace_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const selected = (data ?? []).find((row) => row.id === id);
  if (!selected) throw new Error("celebrity_not_found");
  const ordered = (data ?? []).filter((row) => row.id !== id);
  const position = Math.max(1, Math.min(ordered.length + 1, requestedPosition || ordered.length + 1));
  ordered.splice(position - 1, 0, selected);
  const changed = ordered.flatMap((row, index) => row.workspace_position === index + 1
    ? []
    : [{ id: row.id, position: index + 1 }]);
  await updateOrderInBatches(changed);
}

export function safeId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
