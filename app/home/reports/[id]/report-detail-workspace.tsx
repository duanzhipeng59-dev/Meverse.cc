"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth-context";
import { getStar } from "../../../myfate-data";
import MyfateAdvancedReport from "../../../myfate-advanced-report";
import MyfateFormulaResult from "../../../myfate-formula-result";
import { parseFormulaResult } from "../../../myfate-generated-test-types";
import { readSavedReports, updateSavedReport, type SavedReport } from "../../../myfate-report-storage";

type ReportResponse = {
  report?: string;
  source?: "deepseek" | "gemini";
};

async function generateReport(body: Record<string, unknown>): Promise<ReportResponse> {
  const response = await fetch("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("REPORT_GENERATION_FAILED");
  return response.json() as Promise<ReportResponse>;
}

function legacyReportText(report: SavedReport) {
  if (report.reportText) return report.reportText;
  const old = report.interpretation;
  if (!old) return "";
  return [old.headline, old.summary, old.attraction, old.friction, old.advice].filter(Boolean).join("\n\n");
}

export default function ReportDetailWorkspace({
  reportId,
  fromCelebrityWorkspace = false,
}: {
  reportId: string;
  fromCelebrityWorkspace?: boolean;
}) {
  const { status, email } = useAuth();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [ready, setReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const load = async () => {
      const savedReports = await readSavedReports(email);
      if (!active) return;
      setReport(savedReports.find((item) => item.id === reportId) ?? null);
      setReady(true);
    };
    const reload = () => void load();
    queueMicrotask(reload);
    window.addEventListener("myfate-reports-updated", reload);
    return () => {
      active = false;
      window.removeEventListener("myfate-reports-updated", reload);
    };
  }, [status, email, reportId]);

  const regenerate = useCallback(async () => {
    if (!report) return;
    const star = getStar(report.starId);
    if (!star) return;
    setGenerationError("");
    setIsGenerating(true);
    const generating = await updateSavedReport(report.id, { status: "generating" });
    if (generating) setReport(generating);
    try {
      const result = await generateReport({ action: "report", reportType: "celebrity-match", starId: report.starId, answers: report.answers });
      if (!result.report || !result.source) throw new Error("MODEL_REPORT_MISSING");
      const completed = await updateSavedReport(report.id, {
        status: "advanced",
        reportText: result.report,
        interpretationSource: result.source,
      });
      if (completed) setReport(completed);
    } catch {
      const restored = await updateSavedReport(report.id, { status: "initial" });
      if (restored) setReport(restored);
      setGenerationError("大模型报告生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  }, [report]);

  if (!ready) return <div className="mf-report-detail-state">正在读取报告…</div>;
  if (!report) {
    return (
      <div className="mf-report-detail-state">
        <span>✦</span><h1>没有找到这份报告</h1><p>它可能已被清除，或保存在另一台设备上。</p>
        <Link className="mf-primary-button" href="/home/reports">返回我的报告</Link>
      </div>
    );
  }

  const star = getStar(report.starId);
  const reportText = legacyReportText(report);
  const formulaResult = parseFormulaResult(reportText);
  const formulaStar = star ?? {
    id: report.starId,
    name: report.starName,
    portraitSrc: report.starPortrait,
  };
  const backHref = fromCelebrityWorkspace ? "/home/celebrity-match" : "/home/reports";
  const backLabel = fromCelebrityWorkspace ? "返回明星工作台" : "返回我的报告";
  const retestHref = `/home/celebrity-match/${report.starId}/test?restart=1`;

  if (report.status === "generating" || isGenerating) {
    return (
      <div className="mf-saved-report-detail mf-unified-advanced-report">
        <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>生成中</span></div>
        <div className="mf-report-detail-state mf-ai-generation-state">
          <span>✦</span><h1>关系报告正在生成</h1><p>正在阅读这次测试中的全部选择，并写成完整报告。</p>
          <Link className="mf-secondary-button" href="/home/reports">返回我的报告</Link>
        </div>
      </div>
    );
  }

  if (report.status === "advanced" && reportText) {
    if (formulaResult) {
      return (
        <div className="mf-saved-report-detail mf-unified-advanced-report">
          <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>正缘结果</span></div>
          <MyfateFormulaResult
            star={formulaStar}
            result={formulaResult}
            actions={<Link className="mf-primary-button" href={retestHref}>再测一次</Link>}
          />
        </div>
      );
    }
    if (!star) {
      return (
        <div className="mf-report-detail-state">
          <span>!</span><h1>目标人物资料暂不可用</h1><p>这份旧报告仍然保留，但对应的明星卡片已经下线。</p>
          <Link className="mf-primary-button" href={backHref}>{backLabel}</Link>
        </div>
      );
    }
    return (
      <div className="mf-saved-report-detail mf-unified-advanced-report">
        <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>关系报告</span></div>
        <MyfateAdvancedReport
          star={star}
          reportText={reportText}
          questionCount={report.questionCount ?? report.answers.length}
          actions={<Link className="mf-secondary-button" href={retestHref}>重新测试</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mf-saved-report-detail mf-unified-advanced-report">
      <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>关系报告</span></div>
      <div className="mf-report-detail-state mf-ai-generation-state">
        <span>!</span><h1>这份报告还没有生成完成</h1>
        <p>{generationError || "可以使用已保存的题目和选择重新生成。"}</p>
        <div className="mf-generation-actions">
          <button className="mf-primary-button" type="button" onClick={() => void regenerate()}>重新生成</button>
          <Link className="mf-secondary-button" href={retestHref}>重新测试</Link>
        </div>
      </div>
    </div>
  );
}
