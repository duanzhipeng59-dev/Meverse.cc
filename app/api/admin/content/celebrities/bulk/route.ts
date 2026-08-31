import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../auth/server";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../../server";
import { normalizeCelebrityOrder, safeId } from "../../data";

type BulkAction = "publish" | "delete";

function refreshProductPages(ids: string[]) {
  revalidatePath("/");
  revalidatePath("/home/celebrity-match");
  for (const id of ids) {
    revalidatePath(`/home/celebrity-match/${id}`);
    revalidatePath(`/home/celebrity-match/${id}/test`);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const payload = await request.json() as { action?: unknown; ids?: unknown };
    const action = String(payload.action ?? "") as BulkAction;
    const ids = Array.isArray(payload.ids)
      ? [...new Set(payload.ids.map(safeId).filter(Boolean))].slice(0, 200)
      : [];

    if (!ids.length || !["publish", "delete"].includes(action)) {
      return adminJson({ error: "invalid_bulk_action" }, request, admin, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    if (action === "publish") {
      const { data, error } = await supabase
        .from("celebrity_profiles")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in("id", ids)
        .select("id");
      if (error) throw error;
      const changedIds = (data ?? []).map((row) => row.id as string);
      await writeAuditLog(admin, "celebrity_bulk_publish", "celebrity_profile", undefined, {
        ids: changedIds,
        count: changedIds.length,
      });
      refreshProductPages(changedIds);
      return adminJson({ ok: true, count: changedIds.length }, request, admin);
    }

    const { data, error } = await supabase
      .from("celebrity_profiles")
      .delete()
      .in("id", ids)
      .select("id");
    if (error) throw error;
    const changedIds = (data ?? []).map((row) => row.id as string);
    await normalizeCelebrityOrder();
    await writeAuditLog(admin, "celebrity_bulk_delete", "celebrity_profile", undefined, {
      ids: changedIds,
      count: changedIds.length,
    });
    refreshProductPages(changedIds);
    return adminJson({ ok: true, count: changedIds.length }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
