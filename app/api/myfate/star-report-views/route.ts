import { getSessionUser } from "../../auth/server";
import { getStarReportViews } from "../../../myfate-stars-server";

export const dynamic = "force-dynamic";

// 浏览记录数据接口:客户端筛选组件刷新用(筛选本身在前端完成,不按分类请求)。
export async function GET(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const views = await getStarReportViews(user.id);
  return Response.json({ views });
}
