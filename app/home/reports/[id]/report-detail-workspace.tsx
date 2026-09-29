"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../../auth-context";
import { getStar } from "../../../myfate-data";
import MyfateAdvancedReport from "../../../myfate-advanced-report";
import MyfateFormulaResult from "../../../myfate-formula-result";
import { parseFormulaResult } from "../../../myfate-generated-test-types";
import { parseBaziResult } from "../../../myfate-bazi-types";
import MyfateBaziResult from "../../../myfate-bazi-result";
import { readSavedReports, type SavedReport } from "../../../myfate-report-storage";

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
  const backHref = fromCelebrityWorkspace ? "/home/relationship-test" : "/home/reports";
  const backLabel = fromCelebrityWorkspace ? "返回明星合盘工作台" : "返回我的报告";
  const retestHref = `/home/relationship-test/${report.starId}/test?restart=1`;
  const continueTestHref = `/home/relationship-test/${report.starId}/test?report=${encodeURIComponent(report.id)}`;

  if (report.status === "generating") {
    return (
      <div className="mf-saved-report-detail mf-unified-advanced-report">
          <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>合盘分析生成中</span></div>
        <div className="mf-report-detail-state mf-ai-generation-state">
          <span>✦</span><h1>正在生成吠陀合盘</h1><p>可以返回工作台后重新进入，系统会继续保留这份记录。</p>
          <Link className="mf-primary-button" href={continueTestHref}>重新生成合盘</Link>
        </div>
      </div>
    );
  }

  if (report.status === "advanced" && reportText) {
    const baziResult = parseBaziResult(reportText);
    if (baziResult) {
      return (
        <div className="mf-saved-report-detail mf-unified-advanced-report">
          <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>个人八字解读</span></div>
          <MyfateBaziResult
            result={baziResult}
            actions={<Link className="mf-primary-button" href="/home/personal-reading">重新排盘</Link>}
          />
        </div>
      );
    }
    if (formulaResult) {
      return (
        <div className="mf-saved-report-detail mf-unified-advanced-report">
          <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>{formulaResult.version === 4 ? "吠陀合盘分析" : formulaResult.version === 3 ? "合盘分析" : formulaResult.version === 2 ? "关系身份结果" : "历史正缘结果"}</span></div>
          <MyfateFormulaResult
            star={formulaStar}
            result={formulaResult}
            actions={<Link className="mf-primary-button" href={retestHref}>{formulaResult.version === 3 ? "重新合盘" : "再测一次"}</Link>}
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
        <span>✦</span><h1>这份旧记录尚未完成</h1>
        <p>现在无需答题，输入出生信息即可生成吠陀合盘。</p>
        <div className="mf-generation-actions">
          <Link className="mf-primary-button" href={continueTestHref}>重新合盘</Link>
          <Link className="mf-secondary-button" href={backHref}>{backLabel}</Link>
        </div>
      </div>
    </div>
  );
}
