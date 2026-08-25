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
    if (allowRetest || status === "loading") return;
    const report = readLatestSavedReportForStar(email, star.id);
    if (report) router.replace(`/home/reports/${report.id}?from=celebrity-match`);
  }, [allowRetest, status, email, star.id, router]);

  return <MyfateTest star={star} workspace />;
}
