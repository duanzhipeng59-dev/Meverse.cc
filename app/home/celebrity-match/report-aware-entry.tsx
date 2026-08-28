"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthEntryLink from "../../auth-entry-link";
import { useAuth } from "../../auth-context";
import { readLatestSavedReportForStar, type SavedReport } from "../../myfate-report-storage";

export default function ReportAwareEntry({ starId }: { starId: string }) {
  const { status, email } = useAuth();
  const [report, setReport] = useState<SavedReport | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      queueMicrotask(() => setReport(null));
      return;
    }
    let active = true;
    const load = async () => {
      const latest = await readLatestSavedReportForStar(email, starId);
      if (active) setReport(latest);
    };
    const reload = () => void load();
    queueMicrotask(reload);
    window.addEventListener("myfate-reports-updated", reload);
    return () => {
      active = false;
      window.removeEventListener("myfate-reports-updated", reload);
    };
  }, [status, email, starId]);

  if (report) {
    const href = report.status === "advanced"
      ? `/home/reports/${report.id}?from=celebrity-match`
      : `/home/celebrity-match/${starId}/test?report=${encodeURIComponent(report.id)}`;
    return (
      <Link className="mf-primary-button mf-detail-cta" href={href}>
        {report.status === "advanced" ? "查看关系报告" : report.status === "generating" ? "去测试" : "去答题"} <span>→</span>
      </Link>
    );
  }

  return (
    <AuthEntryLink className="mf-primary-button mf-detail-cta" href={`/home/celebrity-match/${starId}/test`}>
      测试 TA 是否是你的正缘 <span>→</span>
    </AuthEntryLink>
  );
}
