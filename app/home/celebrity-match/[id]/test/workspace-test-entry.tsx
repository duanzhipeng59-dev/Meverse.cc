"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../auth-context";
import type { StarProfile } from "../../../../myfate-data";
import MyfateTest from "../../../../myfate-test";
import { readLatestSavedReportForStar } from "../../../../myfate-report-storage";

export default function WorkspaceTestEntry({
  star,
  allowRetest,
}: {
  star: StarProfile;
  allowRetest: boolean;
}) {
  const { status, email } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      const next = `/home/celebrity-match/${star.id}/test${allowRetest ? "?restart=1" : ""}`;
      const from = `/home/celebrity-match/${star.id}`;
      router.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(from)}`);
      return;
    }
    if (allowRetest || status === "loading") return;
    const report = readLatestSavedReportForStar(email, star.id);
    if (report) router.replace(`/home/reports/${report.id}?from=celebrity-match`);
  }, [allowRetest, status, email, star.id, router]);

  if (status === "anonymous") return <div className="mf-auth-redirect">正在前往登录页…</div>;

  return <MyfateTest star={star} workspace />;
}
