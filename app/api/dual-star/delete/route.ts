import { z } from "zod";
import { createSupabaseAdminClient, getSessionUser } from "../../auth/server";

const deleteSchema = z.object({ reportId: z.string().regex(/^[a-z0-9-]+$/u).min(1).max(64) });

// 删除自己的历史合盘记录:按 id + user_id 双条件删除,他人记录删不到(404)。
export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const { data, error } = await createSupabaseAdminClient()
    .from("dual_star_reports")
    .delete()
    .eq("id", parsed.data.reportId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to delete dual report", error);
    return Response.json({ error: "DELETE_FAILED" }, { status: 503 });
  }
  if (!data) return Response.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
  return Response.json({ ok: true });
}
