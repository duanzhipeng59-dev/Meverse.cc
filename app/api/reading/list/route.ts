import { getSessionUser } from "../../auth/server";
import { listReadingReports } from "../../../myfate-reading-server";

// 解读页生成记录列表(content 不下发;subject 全量下发,弹窗「从记录选」用完整出生信息)
export async function GET(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  try {
    const rows = await listReadingReports(user.id);
    return Response.json({
      reports: rows.map((row) => ({
        id: row.id,
        mode: row.mode,
        dualType: row.dualType,
        status: row.status,
        subjectA: row.subjectA,
        subjectB: row.subjectB,
        createdAt: row.createdAt,
      })),
    });
  } catch {
    return Response.json({ error: "LIST_FAILED" }, { status: 500 });
  }
}
