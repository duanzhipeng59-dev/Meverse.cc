"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { readLatestSavedReportForStar, type SavedReport } from "../../myfate-report-storage";

export default function ReportAwareEntry({ starId }: { starId: string }) {
  const { status, email } = useAuth();
  const [report, setReport] = useState<SavedReport | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const load = () => {
      if (active) setReport(readLatestSavedReportForStar(email, starId));
    };
    queueMicrotask(load);
    window.addEventListener("myfate-reports-updated", load);
    return () => {
      active = false;
      window.removeEventListener("myfate-reports-updated", load);
    };
  }, [status, email, starId]);

  if (report) {
    return (
      <Link className="mf-primary-button mf-detail-cta" href={`/home/reports/${report.id}?from=celebrity-match`}>
        {report.status === "advanced" ? "查看高级报告" : "查看初步报告"} <span>→</span>
      </Link>
    );
  }

  return (
    <Link className="mf-primary-button mf-detail-cta" href={`/home/celebrity-match/${starId}/test`}>
      测试 TA 是否是你的正缘 <span>→</span>
    </Link>
  );
}
