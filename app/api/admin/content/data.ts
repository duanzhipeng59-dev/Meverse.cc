import { createSupabaseAdminClient } from "../../auth/server";

export type AdminCelebrity = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  description: string;
  relationshipStyle: string;
  focus: string;
  mbti: string;
  birthDate: string;
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
    role: row.role,
    tagline: row.tagline,
    description: row.description,
    relationshipStyle: row.relationship_style,
    focus: row.focus,
    mbti: row.mbti,
    birthDate: row.birth_date,
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

export async function loadAdminContent() {
  const supabase = createSupabaseAdminClient();
  const celebrityResult = await supabase
    .from("celebrity_profiles")
    .select("*")
    .order("workspace_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (celebrityResult.error) throw celebrityResult.error;
  return {
    celebrities: ((celebrityResult.data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity),
  };
}

export async function normalizeCelebrityOrder() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("celebrity_profiles")
    .select("id,workspace_position,created_at")
    .order("workspace_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  for (let index = 0; index < (data ?? []).length; index += 1) {
    if (data?.[index]?.workspace_position === index + 1) continue;
    const { error: updateError } = await supabase
      .from("celebrity_profiles")
      .update({ workspace_position: index + 1, updated_at: new Date().toISOString() })
      .eq("id", data?.[index]?.id);
    if (updateError) throw updateError;
  }
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
  for (let index = 0; index < ordered.length; index += 1) {
    const { error: updateError } = await supabase
      .from("celebrity_profiles")
      .update({ workspace_position: index + 1, updated_at: new Date().toISOString() })
      .eq("id", ordered[index].id);
    if (updateError) throw updateError;
  }
}

export function safeId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
