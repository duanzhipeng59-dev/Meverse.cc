import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";
import { requirePageUser } from "../../../require-page-user";

export const dynamic = "force-dynamic";

export default async function PersonalReadingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/home/personal-reading/${id}`);
  return <ReportDetailWorkspace reportId={id} section="personal-reading" />;
}
