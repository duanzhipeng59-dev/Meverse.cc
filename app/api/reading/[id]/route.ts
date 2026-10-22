import { getSessionUser } from "../../auth/server";
import { getReadingReport, recoverStaleReadingReport } from "../../../myfate-reading-server";

// 报告页轮询:只回状态与错误摘要
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const { id } = await params;
  const report = await getReadingReport(id);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const recovered = await recoverStaleReadingReport(report);
  const errorText = recovered.status === "failed" ? ((recovered as unknown as { error?: string }).error ?? null) : null;
  return Response.json({ status: recovered.status, error: errorText });
}
