import { revalidatePath } from "next/cache";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../../server";
import { createSupabaseAdminClient } from "../../../../auth/server";
import { normalizeOptions } from "../../data";

function refresh(starId: string) {
  if (starId === "relationship-profile") revalidatePath("/home/relationship-profile/test");
  else revalidatePath(`/home/celebrity-match/${starId}/test`);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const supabase = createSupabaseAdminClient();
    const { data: current, error: currentError } = await supabase
      .from("myfate_question_bank")
      .select("star_id,code")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return adminJson({ error: "question_not_found" }, request, admin, { status: 404 });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.eyebrow !== undefined) updates.eyebrow = String(payload.eyebrow ?? "").trim() || null;
    if (payload.question !== undefined) updates.question = String(payload.question ?? "").trim();
    if (payload.dimension !== undefined) updates.dimension = String(payload.dimension ?? "security").trim();
    if (payload.options !== undefined) updates.options = normalizeOptions(payload.options);
    if (typeof payload.enabled === "boolean") updates.enabled = payload.enabled;
    if (payload.position !== undefined) updates.position = Math.max(1, Number(payload.position) || 1);
    const { error } = await supabase.from("myfate_question_bank").update(updates).eq("id", id);
    if (error) throw error;
    await writeAuditLog(admin, "question_update", "question", `${current.star_id}:${current.code}`, { fields: Object.keys(payload) });
    refresh(current.star_id);
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
    const { data, error } = await supabase
      .from("myfate_question_bank")
      .delete()
      .eq("id", id)
      .select("star_id,code");
    if (error) throw error;
    const deleted = data?.[0];
    if (!deleted) return adminJson({ error: "question_not_found" }, request, admin, { status: 404 });
    await writeAuditLog(admin, "question_delete", "question", `${deleted.star_id}:${deleted.code}`);
    refresh(deleted.star_id);
    return adminJson({ ok: true }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
