import { revalidatePath } from "next/cache";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../../server";
import { createSupabaseAdminClient } from "../../../../auth/server";
import { loadAdminCelebrity, moveCelebrity, normalizeCelebrityOrder } from "../../data";

function paths(id: string) {
  revalidatePath("/");
  revalidatePath("/home/celebrity-match");
  revalidatePath("/home/relationship-test");
  revalidatePath(`/home/celebrity-match/${id}`);
  revalidatePath(`/home/celebrity-match/${id}/test`);
  revalidatePath(`/home/relationship-test/${id}`);
  revalidatePath(`/home/relationship-test/${id}/test`);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const celebrity = await loadAdminCelebrity(id);
    if (!celebrity) return adminJson({ error: "celebrity_not_found" }, request, admin, { status: 404 });
    return adminJson({ celebrity }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    if (payload.name !== undefined && !String(payload.name ?? "").trim()) return adminJson({ error: "missing_required_fields", fields: ["name"] }, request, admin, { status: 400 });
    if (payload.name !== undefined && String(payload.name ?? "").trim().length > 80) return adminJson({ error: "invalid_field_value", fields: ["name"] }, request, admin, { status: 400 });
    if (payload.mbti !== undefined && !/^(E|I)(N|S)(T|F)(J|P)$/u.test(String(payload.mbti ?? "").trim().toUpperCase())) return adminJson({ error: "invalid_mbti", fields: ["mbti"] }, request, admin, { status: 400 });
    if (payload.birthDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/u.test(String(payload.birthDate ?? "").trim())) return adminJson({ error: "invalid_birth_date", fields: ["birthDate"] }, request, admin, { status: 400 });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const textFields: Array<[string, string, number]> = [
      ["name", "name", 80], ["role", "role", 120], ["tagline", "tagline", 240],
      ["nameEn", "name_en", 160], ["nameZh", "name_zh", 160], ["gender", "gender", 16],
      ["description", "description", 4000], ["relationshipStyle", "relationship_style", 2000],
      ["focus", "focus", 2000], ["mbti", "mbti", 8], ["birthDate", "birth_date", 40],
      ["mbtiSourceType", "mbti_source_type", 40],
      ["mbtiConfidence", "mbti_confidence", 16], ["birthDateConfidence", "birth_date_confidence", 16],
      ["portraitRisk", "portrait_risk", 16], ["commercialDemoRisk", "commercial_demo_risk", 16],
      ["threePillars", "three_pillars", 120], ["portraitUrl", "portrait_url", 2000],
      ["reportPrompt", "report_prompt", 20000],
    ];
    for (const [input, column, limit] of textFields) {
      if (payload[input] !== undefined) updates[column] = String(payload[input] ?? "").trim().slice(0, limit);
    }
    if (payload.role !== undefined && !String(payload.role ?? "").trim()) updates.role = "艺人 · 舞台创作者";
    if (payload.portraitUrl !== undefined && !String(payload.portraitUrl ?? "").trim()) updates.portrait_url = "/historical-figure.svg";
    if (Array.isArray(payload.traits)) updates.traits = payload.traits.map(String).map((item) => item.trim()).filter(Boolean);
    if (Array.isArray(payload.categories)) updates.categories = payload.categories.map(String).map((item) => item.trim()).filter(Boolean);
    if (payload.deathDate !== undefined) updates.death_date = String(payload.deathDate ?? "").trim() || null;
    if (typeof payload.published === "boolean") updates.published = payload.published;
    if (typeof payload.homepageFeatured === "boolean") updates.homepage_featured = payload.homepageFeatured;
    if (typeof payload.isHistoricalFigure === "boolean") updates.is_historical_figure = payload.isHistoricalFigure;
    if (typeof payload.isDeceased === "boolean") updates.is_deceased = payload.isDeceased;
    if (typeof payload.enableBazi === "boolean") updates.enable_bazi = payload.enableBazi;
    if (typeof payload.enableMbti === "boolean") updates.enable_mbti = payload.enableMbti;
    if (payload.recommendationLevel !== undefined) updates.recommendation_level = payload.recommendationLevel === null ? null : Number(payload.recommendationLevel);
    if (payload.homepagePosition !== undefined) updates.homepage_position = payload.homepagePosition === null ? null : Number(payload.homepagePosition);

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("celebrity_profiles").update(updates).eq("id", id);
    if (error) throw error;
    if (payload.workspacePosition !== undefined && payload.workspacePosition !== null) await moveCelebrity(id, Number(payload.workspacePosition));
    await writeAuditLog(admin, "celebrity_update", "celebrity_profile", id, { fields: Object.keys(payload) });
    paths(id);
    return adminJson({ ok: true }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("celebrity_profiles").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return adminJson({ error: "celebrity_not_found" }, request, admin, { status: 404 });
    await normalizeCelebrityOrder();
    await writeAuditLog(admin, "celebrity_delete", "celebrity_profile", id);
    paths(id);
    return adminJson({ ok: true }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
