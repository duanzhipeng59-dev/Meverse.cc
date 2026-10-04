import { notFound } from "next/navigation";
import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// 明星详情页已下线:UUID 是保存的报告,其余直接 404(人物卡直接进报告页)。
export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (UUID_PATTERN.test(id)) {
    const { requirePageUser } = await import("../../../require-page-user");
    await requirePageUser(`/home/relationship-test/${id}`);
    return <ReportDetailWorkspace reportId={id} section="relationship-test" />;
  }
  notFound();
}
