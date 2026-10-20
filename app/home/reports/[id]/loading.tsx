import { DetailSkeleton } from "../../../home/skeletons";

export default function ReportDetailLoading() {
  return (
    <div className="mf-report-route-skeleton" aria-busy="true" aria-label="正在加载报告">
      <DetailSkeleton />
    </div>
  );
}
