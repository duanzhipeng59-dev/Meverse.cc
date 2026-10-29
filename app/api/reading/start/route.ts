import { after } from "next/server";
import { z } from "zod";
import { getSessionUser } from "../../auth/server";
import { getReadingReport, startReadingReport } from "../../../myfate-reading-server";
import { runReadingGeneration } from "../../../myfate-reading-generator";

// 单次直出模版化报告实测 ~65s,含最多 3 次结构重试也在 300s 内(套餐函数上限 300s,600 会被拒)
export const maxDuration = 300;

// 启动「待生成」记录:排盘确认页点「开始解读/开始分析」时把 pending 推进为 generating 并后台生成。
// 非 pending(已在生成/已完成/失败)不动状态、不重复启动,幂等返回 reportId 让前端照常进报告页。
export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = z.object({ reportId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REPORT" }, { status: 400 });

  const report = await getReadingReport(parsed.data.reportId);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    if (report.status === "pending") {
      await startReadingReport(report.id);
      after(async () => {
        await runReadingGeneration(report.id);
      });
    }
    return Response.json({ reportId: report.id });
  } catch (error) {
    console.error("Reading start failed", error);
    return Response.json({ error: "START_FAILED" }, { status: 500 });
  }
}
