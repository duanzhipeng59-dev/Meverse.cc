import { getStarReportViews } from "../../myfate-stars-server";
import { getUserDualReports } from "../../myfate-dual-server";
import { getOptionalPageUser } from "../../require-page-user";
import ReportsBrowser from "./reports-browser";
import { aggregateGroups, type ReportFilter } from "./aggregate";

export const dynamic = "force-dynamic";

// 服务端只负责首屏数据与 URL 初值;筛选切换在客户端即时完成(同一份数据前端分类)。
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const urlFilter: ReportFilter | null = type === "bazi" || type === "dual" ? type : null;
  const user = await getOptionalPageUser("/home/reports");
  const [views, dualReports] = await Promise.all([
    user ? getStarReportViews(user.id) : Promise.resolve([]),
    user ? getUserDualReports(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mf-workspace-content">
      <ReportsBrowser initialGroups={aggregateGroups(views)} dualReports={dualReports} urlFilter={urlFilter} />
    </div>
  );
}
