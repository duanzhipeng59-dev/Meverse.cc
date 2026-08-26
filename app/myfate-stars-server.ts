import { createSupabaseAdminClient } from "./api/auth/server";
import { getStar, stars, type StarProfile } from "./myfate-data";

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
  ideal: StarProfile["ideal"];
};

const selection = "id,name,role,tagline,description,relationship_style,focus,mbti,birth_date,three_pillars,traits,categories,match_count,portrait_url,ideal";

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
    matchCount: new Intl.NumberFormat("en-US").format(row.match_count),
    portraitSrc: row.portrait_url,
    ideal: row.ideal,
  };
}

export async function getPublishedStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(selection)
      .eq("published", true)
      .order("workspace_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const managed = ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
    const managedIds = new Set(managed.map((star) => star.id));
    return [...stars.filter((star) => !managedIds.has(star.id)), ...managed];
  } catch (error) {
    console.error("Failed to read published celebrity profiles", error);
    return stars;
  }
}

export async function getHomepageStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(selection)
      .eq("published", true)
      .eq("homepage_featured", true)
      .order("homepage_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const managed = ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
    return managed.length ? managed : stars;
  } catch (error) {
    console.error("Failed to read homepage celebrity profiles", error);
    return stars;
  }
}

export async function getPublishedStar(id: string): Promise<StarProfile | undefined> {
  if (!hasCloudConfig()) return getStar(id);
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(selection)
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapCelebrity(data as unknown as CelebrityRow);
  } catch (error) {
    console.error("Failed to read celebrity profile", error);
  }
  return getStar(id);
}
