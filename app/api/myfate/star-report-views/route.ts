import { createSupabaseAdminClient, getSessionUser } from "../../auth/server";
import { getStarReportViews } from "../../../myfate-stars-server";

export const dynamic = "force-dynamic";

// 浏览记录数据接口:客户端筛选组件刷新用(筛选本身在前端完成,不按分类请求)。
export async function GET(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const views = await getStarReportViews(user.id);
  return Response.json({ views });
}

// 删除浏览记录(报告本身是公开内容,删除仅移除个人记录)。
export async function DELETE(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { starId } = await request.json().catch(() => ({ starId: "" })) as { starId?: string };
  if (!starId || !/^[a-z0-9-]+$/u.test(starId)) return Response.json({ error: "INVALID_STAR" }, { status: 400 });
  const { error } = await createSupabaseAdminClient()
    .from("star_report_views")
    .delete()
    .eq("user_id", user.id)
    .eq("star_id", starId);
  if (error) return Response.json({ error: "DELETE_FAILED" }, { status: 503 });
  return Response.json({ ok: true });
}
