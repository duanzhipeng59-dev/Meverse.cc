"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReadingSubject } from "../../../myfate-reading-server";

export default function FailedReading({ mode, subjectA, subjectB }: { mode: "single" | "dual"; subjectA: ReadingSubject; subjectB: ReadingSubject | null }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  async function retry() {
    if (retrying) return;
    setRetrying(true); setError("");
    try {
      const body = mode === "dual" ? { mode, subjectA, subjectB } : { mode, subjectA };
      const response = await fetch("/api/reading/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { reportId?: string; detail?: string };
      if (!response.ok || !data.reportId) throw new Error(data.detail || "重试失败，请稍后再试");
      router.push(`/home/reading/${data.reportId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后再试");
      setRetrying(false);
    }
  }
  return (
    <section className="mf-reading-failed" aria-live="polite">
      <div className="mf-reading-failed-icon" aria-hidden="true">!</div>
      <div>
        <h2>这次解读没有生成</h2>
        <p>命盘信息已保留，可以重新生成一份报告。</p>
      </div>
      <button type="button" onClick={() => void retry()} disabled={retrying}>{retrying ? "正在重新生成…" : "重新生成"}</button>
      {error ? <small role="alert">{error}</small> : null}
    </section>
  );
}
