"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth-context";
import { dimensionLabels, getStar, type Dimension } from "../../../myfate-data";
import {
  dimensionScores,
  finalVerdict,
  type FateInterpretation,
} from "../../../myfate-engine";
import { readSavedReports, updateSavedReport, type SavedReport } from "../../../myfate-report-storage";
import { readBasicProfile } from "../../../myfate-progressive-profile";
import MyfateAdvancedReport from "../../../myfate-advanced-report";

const fateTitles = {
  "绝对": "红颜祸水",
  "可能": "命定心动",
  "也许": "暧昧引力",
  "不太像": "擦肩缘分",
  "不是": "平行时空",
} as const;

async function personalize(body: Record<string, unknown>): Promise<{ interpretation?: FateInterpretation; source?: "deepseek" | "gemini" }> {
  const response = await fetch("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("PERSONALIZATION_FAILED");
  return response.json() as Promise<{ interpretation?: FateInterpretation; source?: "deepseek" | "gemini" }>;
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
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setReport(readSavedReports(email).find((item) => item.id === reportId) ?? null);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [status, email, reportId]);

  const upgradeReport = useCallback(async () => {
    if (!report) return;
    const star = getStar(report.starId);
    if (!star) return;
    setReportGenerationError("");
    setIsUpgrading(true);
    try {
      const basicProfile = readBasicProfile(email);
      const result = await personalize({
        action: "interpretation",
        starId: star.id,
        initialScore: report.score,
        finalScore: report.score,
        answers: report.answers,
        behaviorScores: report.behaviorScores ?? dimensionScores(report.answers),
        userMbti: basicProfile.mbti,
        birthDate: basicProfile.birthDate,
      });
      if (result.interpretation && result.source) {
        const completed = updateSavedReport(email, report.id, {
          status: "advanced",
          interpretation: result.interpretation,
          interpretationSource: result.source,
        });
        if (completed) setReport(completed);
      } else {
        throw new Error("MODEL_REPORT_MISSING");
      }
    } catch {
      setReportGenerationError("大模型报告生成失败，请稍后重试。");
    } finally {
      setIsUpgrading(false);
    }
  }, [email, report]);

  useEffect(() => {
    if (!ready || !report || report.status !== "advanced" || report.interpretationSource || isUpgrading || reportGenerationError) return;
    const timer = window.setTimeout(() => void upgradeReport(), 0);
    return () => window.clearTimeout(timer);
  }, [isUpgrading, ready, report, reportGenerationError, upgradeReport]);

  if (!ready) return <div className="mf-report-detail-state">正在读取报告…</div>;

  if (!report) {
    return (
      <div className="mf-report-detail-state">
        <span>✦</span>
        <h1>没有找到这份报告</h1>
        <p>它可能已被清除，或保存在另一台设备上。</p>
        <Link className="mf-primary-button" href="/home/reports">返回我的报告</Link>
      </div>
    );
  }

  const verdict = finalVerdict(report.score);
  const reportStar = getStar(report.starId);
  const scores = report.behaviorScores ?? dimensionScores(report.answers);
  const questionCount = report.questionCount ?? report.answers.length;
  const interpretation = report.interpretation;
  const backHref = fromCelebrityWorkspace ? "/home/celebrity-match" : "/home/reports";
  const backLabel = fromCelebrityWorkspace ? "返回明星工作台" : "返回我的报告";
  const retestHref = `/home/celebrity-match/${report.starId}/test?restart=1`;

  if (report.status === "advanced" && reportStar) {
    if (!report.interpretationSource || !interpretation) {
      return (
        <div className="mf-saved-report-detail mf-unified-advanced-report">
          <div className="mf-saved-report-topbar"><Link className="mf-back-link" href={backHref}>← {backLabel}</Link><span>高级报告</span></div>
          <div className="mf-report-detail-state mf-ai-generation-state">
            <span>{isUpgrading ? "✦" : "!"}</span>
            <h1>{isUpgrading ? "正在重新生成高级报告" : "高级报告暂时没有生成"}</h1>
            <p>{isUpgrading ? "正在使用大模型重新解读这份历史数据…" : reportGenerationError}</p>
            {!isUpgrading ? <button className="mf-primary-button" type="button" onClick={() => void upgradeReport()}>重新生成</button> : null}
          </div>
        </div>
      );
    }
    return (
      <div className="mf-saved-report-detail mf-unified-advanced-report">
        <div className="mf-saved-report-topbar">
          <Link className="mf-back-link" href={backHref}>← {backLabel}</Link>
          <span>高级报告</span>
        </div>
        <div className="mf-saved-report-content">
          <MyfateAdvancedReport
            star={reportStar}
            score={report.score}
            questionCount={questionCount}
            answers={report.answers}
            behaviorScores={scores}
            interpretation={interpretation}
            isInterpreting={isUpgrading}
            disclaimer="历史报告仅用于娱乐与关系想象，不构成现实关系预测。"
            actions={(
              <>
                <Link className="mf-secondary-button" href={retestHref}>重新测试</Link>
              </>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mf-saved-report-detail">
      <div className="mf-saved-report-topbar">
        <Link className="mf-back-link" href={backHref}>← {backLabel}</Link>
        <span>{report.status === "advanced" ? "高级报告" : "初步报告"}</span>
      </div>

      <div className="mf-saved-report-content">
        <section className="mf-saved-report-hero">
          <div
            className="mf-saved-report-avatar"
            role="img"
            aria-label={report.starName}
            style={{ backgroundImage: `url("${report.starPortrait}")` }}
          />
          <div className="mf-saved-report-person">
            <span>你与 TA 的历史报告</span>
            <strong>{report.starName}</strong>
          </div>
          <span className={report.status === "advanced" ? "mf-report-status advanced" : "mf-report-status initial"}>
            {report.status === "advanced" ? "高级报告" : "初步报告"}
          </span>
          <div className="mf-saved-report-verdict">
            <span>{report.status === "advanced" ? "你是 TA 的" : "缘分初印象"}</span>
            <h1>{report.status === "advanced" ? fateTitles[verdict] : report.initialTitle}</h1>
            {report.status === "advanced" ? <strong>{report.score}<small>%</small></strong> : null}
          </div>
          {interpretation ? <p>{interpretation.summary}</p> : <p>这份记录保存了你完成 {questionCount} 道关系情境后的初步缘分信号。</p>}
        </section>

        <section className="mf-saved-report-dimensions">
          <div>
            <span>{questionCount} 题回答画像</span>
            <h2>你的关系回应方式</h2>
          </div>
          <div className="mf-saved-dimension-grid">
            {(Object.keys(scores) as Dimension[]).map((dimension) => (
              <article key={dimension}>
                <div><span>{dimensionLabels[dimension]}</span><strong>{scores[dimension]}%</strong></div>
                <i><b style={{ width: `${scores[dimension]}%` }} /></i>
              </article>
            ))}
          </div>
        </section>

        {report.status === "initial" ? (
          <section className="mf-saved-report-upgrade">
            <span>继续这份报告</span>
            <h2>解锁完整缘分画像</h2>
            <p>你已经完成全部题目，可以直接基于这次回答生成高级报告，无需重新测试。</p>
            <button className="mf-primary-button" type="button" disabled={isUpgrading} onClick={() => void upgradeReport()}>
              {isUpgrading ? "正在生成…" : "解锁高级报告"} <span>→</span>
            </button>
          </section>
        ) : interpretation ? (
          <>
            <div className="mf-saved-report-insights">
              <article><span>为什么会靠近</span><h2>最有可能产生默契的地方</h2><p>{interpretation.attraction}</p></article>
              <article><span>为什么可能错过</span><h2>真正进入关系后的考验</h2><p>{interpretation.friction}</p></article>
              <article className="advice"><span>✦ 专属相处建议</span><h2>如果你们真的开始靠近</h2><p>{interpretation.advice}</p></article>
            </div>

            {interpretation.mbtiInsight || interpretation.behaviorInsight || interpretation.pillarInsight ? (
              <section className="mf-saved-deep-analysis">
                <div><span>深层关系解码</span><h2>人格、行为与三柱关系</h2></div>
                <div className="mf-saved-deep-grid">
                  {interpretation.mbtiInsight ? <article><i>MBTI</i><h3>认知与表达节奏</h3><p>{interpretation.mbtiInsight}</p></article> : null}
                  {interpretation.behaviorInsight ? <article><i>行为</i><h3>压力下的自然反应</h3><p>{interpretation.behaviorInsight}</p></article> : null}
                  {interpretation.pillarInsight ? (
                    <article><i>三柱</i><h3>{interpretation.userThreePillars} × {reportStar?.threePillars}</h3><p>{interpretation.pillarInsight}</p></article>
                  ) : null}
                </div>
                {interpretation.relationshipDynamic ? <p className="mf-saved-dynamic"><strong>综合关系动力</strong>{interpretation.relationshipDynamic}</p> : null}
                {interpretation.actionPlan?.length ? (
                  <ol>{interpretation.actionPlan.map((action, index) => <li key={action}><i>{index + 1}</i><span>{action}</span></li>)}</ol>
                ) : null}
              </section>
            ) : (
              <section className="mf-saved-report-upgrade">
                <span>报告已升级</span>
                <h2>补充深层关系解码</h2>
                <p>可以重新生成一版包含人格互动、行为模式与三柱关系倾向的深度解读。</p>
                <button className="mf-primary-button" type="button" disabled={isUpgrading} onClick={() => void upgradeReport()}>
                  {isUpgrading ? "正在生成…" : "生成深度解读"} <span>→</span>
                </button>
              </section>
            )}
          </>
        ) : null}

        <div className="mf-saved-report-actions">
          <Link className="mf-secondary-button" href={retestHref}>重新测试</Link>
        </div>
        <p className="mf-disclaimer">历史报告仅用于娱乐与关系想象，不构成现实关系预测。</p>
      </div>
    </div>
  );
}
