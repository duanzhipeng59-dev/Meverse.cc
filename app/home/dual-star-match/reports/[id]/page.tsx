import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StarAskPanel from "../../../relationship-test/[id]/test/ask-panel";
import ReportTopbar from "../../../../report-topbar";
import ShareButton from "../../../../share-button";
import DualGenerating from "./dual-generating";
import { getDualReport } from "../../../../myfate-dual-server";
import { getPublishedStar } from "../../../../myfate-stars-server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";
import { dualReportSchema, type DualReportContent } from "../../../../myfate-dual-generator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "双星合盘报告" };

const ASK_SUGGESTIONS = [
  "谁更容易先被对方吸引？",
  "两个人更适合合作还是建立亲密关系？",
  "这段关系最容易因为什么发生矛盾？",
];

const SCORE_LABELS: Record<string, string> = {
  overall: "综合协调度", attraction: "吸引力", communication: "沟通默契", emotion: "情绪连接", cooperation: "合作能力", conflict: "冲突压力", longevity: "长期稳定",
};

export default async function DualReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/home/dual-star-match/reports/${id}`);
  const report = await getDualReport(id);
  if (!report || report.userId !== user.id) notFound();
  const [starA, starB, metered] = await Promise.all([getPublishedStar(report.starA), getPublishedStar(report.starB), isUpgradesEnabled()]);
  if (!starA || !starB) notFound();

  return (
    <div className="mf-zr">
      <ReportTopbar backHref="/home/dual-star-match" backLabel="返回双星合盘" />

      {report.status !== "ready" ? (
        <DualGenerating reportId={report.id} nameA={starA.name} nameB={starB.name} portraitA={starA.portraitSrc} portraitB={starB.portraitSrc} />
      ) : (() => {
        const parsed = dualReportSchema.safeParse(report.content);
        if (!parsed.success) notFound();
        const content: DualReportContent = parsed.data;
        return (
          <>
            <header className="mf-dual-report-hero">
              <div className="mf-dual-report-people">
                <figure>
                  <Image src={starA.portraitSrc} alt={starA.name} width={92} height={112} unoptimized />
                  <figcaption>{starA.name}</figcaption>
                </figure>
                <span aria-hidden="true">×</span>
                <figure>
                  <Image src={starB.portraitSrc} alt={starB.name} width={92} height={112} unoptimized />
                  <figcaption>{starB.name}</figcaption>
                </figure>
              </div>
              <div className="mf-dual-report-copy">
                <span className="mf-zr-kicker">DUAL STAR SYNASTRY</span>
                <h1>{starA.name} × {starB.name} 双星合盘报告</h1>
                <p className="mf-dual-report-keywords">{content.keywords.join(" · ")}</p>
                <p className="mf-dual-report-summary">{content.summary}</p>
                <small>基于公开出生资料与命理模型推导 · 分数为报告内部相对趋势，不代表现实关系</small>
              </div>
              <ShareButton />
            </header>

            <section className="mf-zr-card">
              <div className="mf-zr-section-head"><span>01</span><div><h2>关系总览</h2><p>七个维度的相对互动趋势</p></div></div>
              <div className="mf-dual-scores">
                {Object.entries(content.scores).map(([key, value]) => (
                  <div key={key}>
                    <span>{SCORE_LABELS[key] ?? key}</span>
                    <div className="mf-dual-score-bar"><i style={{ width: `${Math.round(value)}%` }} data-tone={key === "conflict" ? "caution" : value >= 70 ? "good" : value >= 50 ? "neutral" : "caution"} /></div>
                    <b>{Math.round(value)}</b>
                  </div>
                ))}
              </div>
              <p className="mf-zr-chart-note">分数只表示这份报告内部的相对关系趋势，不表达两位明星的现实关系结论。</p>
            </section>

            {[
              { no: "02", field: "attraction" as const },
              { no: "03", field: "emotion" as const },
              { no: "04", field: "dynamics" as const },
              { no: "05", field: "career" as const },
              { no: "06", field: "conflict" as const },
              { no: "07", field: "longterm" as const },
            ].map(({ no, field }) => (
              <section className="mf-zr-card" key={field}>
                <div className="mf-zr-section-head"><span>{no}</span><div><h2>{content.sections[field].title}</h2><p>{field === "attraction" ? "吸引点、初期互动与落差" : field === "emotion" ? "表达方式与情绪需求的匹配" : field === "dynamics" ? "推动力、节奏与相互影响" : field === "career" ? "协作方式与互补点" : field === "conflict" ? "摩擦位置与成长课题" : "关系持续发展的条件"}</p></div></div>
                {content.sections[field].paragraphs.map((paragraph, index) => <p className="mf-dual-paragraph" key={index}>{paragraph}</p>)}
              </section>
            ))}

            <section className="mf-zr-card">
              <div className="mf-zr-section-head"><span>08</span><div><h2>命理依据</h2><p>结论来自这些合盘结构（附白话解释）</p></div></div>
              <dl className="mf-dual-basis">
                {content.basis.map((item, index) => (
                  <div key={index}><dt>{item.term}</dt><dd>{item.plain}</dd></div>
                ))}
              </dl>
            </section>

            <div id="ask">
              <StarAskPanel starId={report.id} starName={`${starA.name} × ${starB.name}`} suggestions={ASK_SUGGESTIONS} metered={metered} reportType="dual" />
            </div>

            <p className="mf-zr-note">本报告基于公开出生资料与命理模型生成，仅用于娱乐和自我探索，不代表当事人的现实关系或真实态度。</p>
          </>
        );
      })()}
    </div>
  );
}
