import { getSessionUser } from "../../auth/server";
import { getUserDualReports } from "../../../myfate-dual-server";
import { isUpgradesEnabled } from "../../../myfate-settings";

// 双人合盘入口页的客户端引导数据:页面壳已静态化,登录态与个人历史由前端拉取。
// GET:返回 { metered, history: [渲染横条所需字段] },未登录时 history 为空数组。
export async function GET(request: Request) {
  const [metered, session] = await Promise.all([
    isUpgradesEnabled().catch(() => true),
    getSessionUser(request),
  ]);
  if (!session?.user?.id) return Response.json({ metered, history: [] });

  const history = await getUserDualReports(session.user.id).catch(() => []);
  return Response.json({
    metered,
    history: history.map((row) => ({
      id: row.id,
      starA: row.starA,
      starB: row.starB,
      nameA: row.nameA,
      nameB: row.nameB,
      portraitA: row.portraitA,
      portraitB: row.portraitB,
      status: row.status,
      createdAt: row.createdAt,
    })),
  });
}
