import { after } from "next/server";
import { z } from "zod";
import { getSessionUser } from "../../auth/server";
import { consumeReadingCredit, getReadingReport, startReadingReport } from "../../../myfate-reading-server";
import { runReadingGeneration } from "../../../myfate-reading-generator";

// 单次直出模版化报告实测 ~65s,含最多 3 次结构重试也在 300s 内(套餐函数上限 300s,600 会被拒)
export const maxDuration = 300;

// 启动「待生成」记录:排盘确认页点「开始解读/开始分析」时先扣 1 次解读额度,
// 再把 pending 推进为 generating 并后台生成。额度不足 402 引导购买;
// 生成失败由生成管线的 catch 自动退款(refund_reading_credit,幂等)。
// 非 pending(已在生成/已完成/失败)不扣费、不重复启动,幂等返回 reportId。
export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = z.object({ reportId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REPORT" }, { status: 400 });

  const report = await getReadingReport(parsed.data.reportId);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    if (report.status === "pending") {
      try {
        await consumeReadingCredit(report.userId, report.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("INSUFFICIENT_CREDITS")) {
          return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
        }
        throw error;
      }
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
