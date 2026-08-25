import ReportDetailWorkspace from "./report-detail-workspace";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  return (
    <ReportDetailWorkspace
      reportId={(await params).id}
      fromCelebrityWorkspace={(await searchParams).from === "celebrity-match"}
    />
  );
}
