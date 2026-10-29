"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReadingSubject } from "../../../myfate-reading-server";
import { writeConfirmPayload } from "../../dual-star-match/confirm-storage";

// 「待生成」记录的报告地址:还没有内容可看,带上完整 subject(含 reportId)回排盘确认页续走「开始解读」。
export default function PendingReading({ reportId, mode, subjectA, subjectB }: { reportId: string; mode: "single" | "dual"; subjectA: ReadingSubject; subjectB: ReadingSubject | null }) {
  const router = useRouter();
  useEffect(() => {
    writeConfirmPayload(mode === "dual"
      ? { mode, subjectA, subjectB: subjectB ?? undefined, reportId }
      : { mode, subjectA, reportId });
    router.replace("/home/dual-star-match/confirm");
  }, [reportId, mode, subjectA, subjectB, router]);
  return (
    <div className="mf-dual-status" aria-live="polite">
      <p className="mf-dual-status-note">这份解读还未开始生成，正在回到排盘页…</p>
    </div>
  );
}
