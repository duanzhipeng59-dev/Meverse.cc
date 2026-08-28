import { revalidatePath } from "next/cache";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../../server";
import { createSupabaseAdminClient } from "../../../../auth/server";
import { moveCelebrity, normalizeCelebrityOrder } from "../../data";

function paths(id: string) {
  revalidatePath("/");
  revalidatePath("/home/celebrity-match");
  revalidatePath(`/home/celebrity-match/${id}`);
  revalidatePath(`/home/celebrity-match/${id}/test`);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const textFields: Array<[string, string, number]> = [
      ["name", "name", 120], ["role", "role", 160], ["tagline", "tagline", 240],
      ["description", "description", 4000], ["relationshipStyle", "relationship_style", 2000],
      ["focus", "focus", 2000], ["mbti", "mbti", 8], ["birthDate", "birth_date", 40],
      ["threePillars", "three_pillars", 120], ["portraitUrl", "portrait_url", 2000],
      ["reportPrompt", "report_prompt", 20000],
    ];
    for (const [input, column, limit] of textFields) {
      if (payload[input] !== undefined) updates[column] = String(payload[input] ?? "").trim().slice(0, limit);
    }
    if (Array.isArray(payload.traits)) updates.traits = payload.traits.map(String).map((item) => item.trim()).filter(Boolean);
    if (Array.isArray(payload.categories)) updates.categories = payload.categories.map(String).map((item) => item.trim()).filter(Boolean);
    if (typeof payload.published === "boolean") updates.published = payload.published;
    if (typeof payload.homepageFeatured === "boolean") updates.homepage_featured = payload.homepageFeatured;
    if (payload.homepagePosition !== undefined) updates.homepage_position = payload.homepagePosition === null ? null : Number(payload.homepagePosition);

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("celebrity_profiles").update(updates).eq("id", id);
    if (error) throw error;
    if (payload.workspacePosition !== undefined) await moveCelebrity(id, Number(payload.workspacePosition));
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
