"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../../auth-context";
import {
  readRelationshipReports,
  updateRelationshipReport,
  type RelationshipProfileReport,
} from "../../../../relationship-profile-storage";

async function requestReport(answers: RelationshipProfileReport["answers"]) {
  const response = await fetch("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "report", reportType: "relationship-profile", answers }),
  });
  if (!response.ok) throw new Error("REPORT_GENERATION_FAILED");
  return response.json() as Promise<{ report?: string }>;
}

export default function RelationshipProfileResult({ reportId }: { reportId: string }) {
  const { status, email } = useAuth();
  const [report, setReport] = useState<RelationshipProfileReport | null>(null);
  const [ready, setReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const found = readRelationshipReports(email).find((item) => item.id === reportId) ?? null;
      setReport(found);
      setReady(true);
    });
    return () => { active = false; };
  }, [status, email, reportId]);

  const generate = useCallback(async (current: RelationshipProfileReport) => {
    setIsGenerating(true);
    setGenerationError("");
    updateRelationshipReport(email, current.id, { status: "generating" });
    try {
      const result = await requestReport(current.answers);
      if (!result.report) throw new Error("MODEL_REPORT_MISSING");
      const completed = updateRelationshipReport(email, current.id, { status: "complete", reportText: result.report });
      if (completed) setReport(completed);
    } catch {
      const failed = updateRelationshipReport(email, current.id, { status: "failed" });
      if (failed) setReport(failed);
      setGenerationError("报告生成失败，请检查网络后重试。");
    } finally {
      setIsGenerating(false);
    }
  }, [email]);

  useEffect(() => {
    if (!report || report.status !== "generating" || started.current) return;
    started.current = true;
    void generate(report);
  }, [generate, report]);

  if (!ready) return <div className="mf-report-detail-state">正在读取报告…</div>;
  if (!report) {
    return (
      <div className="mf-report-detail-state">
        <span>✦</span><h1>没有找到这份报告</h1><p>它可能已经从当前浏览器中清除。</p>
        <Link className="mf-primary-button" href="/home/relationship-profile">重新测试</Link>
      </div>
    );
  }

  if (report.status !== "complete" || !report.reportText) {
    return (
      <div className="mf-saved-report-detail mf-relationship-result">
        <div className="mf-saved-report-topbar"><Link className="mf-back-link" href="/home/relationship-profile">← 返回关系画像</Link><span>关系行为报告</span></div>
        <div className="mf-report-detail-state mf-ai-generation-state">
          <span>{isGenerating ? "✦" : "!"}</span>
          <h1>{isGenerating ? "正在生成你的关系行为报告" : "报告暂时没有生成"}</h1>
          <p>{isGenerating ? "正在阅读本次测试中的全部选择，并写成完整报告。" : generationError || "可以使用已经保存的选择重新生成。"}</p>
          {!isGenerating ? (
            <button className="mf-primary-button" type="button" onClick={() => { started.current = true; void generate(report); }}>重新生成</button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mf-saved-report-detail mf-relationship-result">
      <div className="mf-saved-report-topbar"><Link className="mf-back-link" href="/home/relationship-profile">← 返回关系画像</Link><span>关系行为报告</span></div>
      <div className="mf-model-only-report">
        <section className="mf-model-report-paper">
          <div className="mf-model-report-person"><span className="mf-profile-result-symbol">✦</span><strong>你的关系行为报告</strong></div>
          <article className="mf-model-report-text">{report.reportText}</article>
        </section>
        <div className="mf-result-actions">
          <Link className="mf-primary-button" href="/home/relationship-profile/test">重新测试</Link>
          <Link className="mf-secondary-button" href="/home/reports">查看我的收藏</Link>
        </div>
        <p className="mf-disclaimer">结果仅用于自我观察与娱乐，不构成心理诊断或专业建议。</p>
      </div>
    </div>
  );
}
