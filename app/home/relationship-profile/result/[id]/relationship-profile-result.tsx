"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../../../auth-context";
import { relationshipDimensions, type RelationshipDimension } from "../../../../relationship-profile-data";
import { readRelationshipReports, type RelationshipProfileReport } from "../../../../relationship-profile-storage";

export default function RelationshipProfileResult({ reportId }: { reportId: string }) {
  const { status, email } = useAuth();
  const [report, setReport] = useState<RelationshipProfileReport | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (status === "loading") return;
    queueMicrotask(() => { setReport(readRelationshipReports(email).find((item) => item.id === reportId) ?? null); setReady(true); });
  }, [status, email, reportId]);

  if (!ready) return <div className="mf-report-detail-state">正在读取画像…</div>;
  if (!report) return <div className="mf-report-detail-state"><span>✦</span><h1>没有找到这份画像</h1><p>它可能已经从当前浏览器中清除。</p><Link className="mf-primary-button" href="/home/relationship-profile">重新测试</Link></div>;

  const dimensions = Object.keys(relationshipDimensions) as RelationshipDimension[];
  const ranked = [...dimensions].sort((a, b) => Math.abs(report.scores[b] - 50) - Math.abs(report.scores[a] - 50));
  const primary = ranked[0];
  const primaryInfo = relationshipDimensions[primary];
  const primaryHigh = report.scores[primary] >= 50;
  const growth = ranked.at(-1) ?? "security";
  const growthInfo = relationshipDimensions[growth];

  return (
    <div className="mf-saved-report-detail mf-relationship-result">
      <div className="mf-saved-report-topbar"><Link className="mf-back-link" href="/home/relationship-profile">← 返回关系画像</Link><span>关系行为画像</span></div>
      <div className="mf-saved-report-content">
        <section className="mf-saved-report-hero">
          <div className="mf-profile-result-symbol">✦</div><span className="mf-kicker">你的核心关系模式</span>
          <div className="mf-saved-report-verdict"><h1>{report.title}</h1></div>
          <p>{primaryHigh ? primaryInfo.highSummary : primaryInfo.lowSummary} 这不是固定标签，而是你在当前阶段更自然的行为倾向。</p>
        </section>
        <section className="mf-saved-report-dimensions">
          <div><span>24 道情境回答</span><h2>你的六维关系画像</h2></div>
          <div className="mf-profile-score-list">
            {dimensions.map((dimension) => {
              const info = relationshipDimensions[dimension]; const score = report.scores[dimension];
              return <article key={dimension}><div><span>{info.low}</span><strong>{info.label}</strong><span>{info.high}</span></div><i><b style={{ left: `${score}%` }} /></i><p>{score >= 50 ? info.highSummary : info.lowSummary}</p></article>;
            })}
          </div>
        </section>
        <div className="mf-saved-report-insights">
          <article><span>你的自然优势</span><h2>{primaryHigh ? primaryInfo.high : primaryInfo.low}</h2><p>{primaryHigh ? primaryInfo.highSummary : primaryInfo.lowSummary} 当你能把这种需要表达清楚，它会成为关系里的稳定力量。</p></article>
          <article><span>值得继续观察</span><h2>{growthInfo.label}</h2><p>这个维度目前更接近中间状态，说明你的选择会随对象和情境变化。留意压力下的真实反应，会更了解自己。</p></article>
          <article className="advice"><span>✦ 相处提醒</span><h2>把倾向变成可以沟通的需要</h2><p>任何一种模式都没有绝对好坏。比改变自己更重要的是，让对方知道你如何感受安全、怎样表达，以及冲突后需要怎样重新靠近。</p></article>
        </div>
        <div className="mf-saved-report-actions"><Link className="mf-primary-button" href="/home/relationship-profile/test">重新测试</Link><Link className="mf-secondary-button" href="/home/reports">查看我的报告</Link></div>
        <p className="mf-disclaimer">结果仅用于自我观察与娱乐，不构成心理诊断或专业建议。</p>
      </div>
    </div>
  );
}
