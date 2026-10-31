"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReadingSubject } from "../../../myfate-reading-server";
import { precheckCredits, writeConfirmPayload } from "../../dual-star-match/confirm-storage";

// 「待生成」记录的报告地址:还没有内容可看,带上完整 subject(含 reportId)回排盘确认页续走「开始解读」。
export default function PendingReading({ reportId, mode, subjectA, subjectB, retry = false }: { reportId?: string; mode: "single" | "dual"; subjectA: ReadingSubject; subjectB: ReadingSubject | null; retry?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    // 先额度预检再跳:确认页首帧即带出正确的 CTA;预检期间停留在本组件的「正在回到排盘页…」提示
    let cancelled = false;
    (async () => {
      const credits = await precheckCredits();
      if (cancelled) return;
      // retry(失败记录重开)不带 reportId:确认页会落一条新的「待生成」并按 retry 态展示「重新分析」
      writeConfirmPayload(mode === "dual"
        ? { mode, subjectA, subjectB: subjectB ?? undefined, reportId, retry: reportId ? undefined : true, credits }
        : { mode, subjectA, reportId, retry: reportId ? undefined : true, credits });
      router.replace("/home/dual-star-match/confirm");
    })();
    return () => { cancelled = true; };
  }, [reportId, mode, subjectA, subjectB, router]);
  return (
    <div className="mf-dual-status" aria-live="polite">
      <p className="mf-dual-status-note">{retry ? "上次生成失败，次数已退回，正在回到排盘页…" : "这份解读还未开始生成，正在回到排盘页…"}</p>
    </div>
  );
}
