import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StarAskFloat from "../../../relationship-test/[id]/test/star-ask-float";
import ReportTopbar from "../../../../report-topbar";
import ReportToc from "../../../../report-toc";
import DualGenerating from "./dual-generating";
import { getDualReport } from "../../../../myfate-dual-server";
import { getPublishedStar } from "../../../../myfate-stars-server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";
import { dualReportSchema, type DualReportContent } from "../../../../myfate-dual-generator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI双星命理合盘报告" };

const ASK_SUGGESTIONS = [
  "谁更容易先被对方吸引？",
  "两个人更适合合作还是建立亲密关系？",
  "这段关系最容易因为什么发生矛盾？",
];

const SCORE_LABELS: Record<string, string> = {
  overall: "综合协调度", attraction: "吸引力", communication: "沟通默契", emotion: "情绪连接", cooperation: "合作能力", conflict: "冲突压力", longevity: "长期稳定",
};

const CONF_LABELS: Record<string, string> = { strong: "强依据", medium: "中等依据", light: "弱依据" };

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
        // 评分唯一来源:引擎在创建时落库的结构分
        const scores = report.scores ?? {};
        const sectionDefs: Array<{ no: string; field: keyof DualReportContent["sections"]; sub: string; anchor: string }> = [
          { no: "02", field: "attraction", sub: "吸引点、化学反应与落差", anchor: "d-attraction" },
          { no: "03", field: "communication", sub: "表达差异与情绪需求", anchor: "d-communication" },
          { no: "04", field: "intimacy", sub: "亲近质地与需求匹配", anchor: "d-intimacy" },
          { no: "05", field: "conflict", sub: "摩擦位置与处理方法", anchor: "d-conflict" },
          { no: "06", field: "career", sub: "协作方式与互补点", anchor: "d-career" },
          { no: "07", field: "longterm", sub: "关系持续的条件", anchor: "d-longterm" },
          { no: "08", field: "timeline", sub: "未来三年关系节奏窗口", anchor: "d-timeline" },
        ];
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
                <span className="mf-zr-kicker">DUAL BAZI SYNASTRY</span>
                <h1>{starA.name} × {starB.name} AI双星命理合盘</h1>
                <p className="mf-dual-report-keywords">{content.keywords.join(" · ")}</p>
                <p className="mf-dual-report-summary">{content.summary}</p>
                <small>基于公开出生资料与八字合盘规则推导 · 分数由确定性引擎计算,表示报告内部相对趋势</small>
              </div>
            </header>

            <ReportToc items={[
              { id: "d-overview", label: "总览" },
              { id: "d-attraction", label: "吸引" },
              { id: "d-communication", label: "沟通" },
              { id: "d-intimacy", label: "亲密" },
              { id: "d-conflict", label: "冲突" },
              { id: "d-career", label: "事业" },
              { id: "d-longterm", label: "长期" },
              { id: "d-timeline", label: "时间线" },
              { id: "d-ask", label: "AI 追问" },
            ]} />

            <section className="mf-zr-card" id="d-overview">
              <div className="mf-zr-section-head"><span>01</span><div><h2>关系总览</h2><p>七个维度的引擎结构评分</p></div></div>
              <div className="mf-dual-scores">
                {Object.entries(SCORE_LABELS).map(([key, label]) => {
                  const value = Number(scores[key] ?? 0);
                  return (
                    <div key={key}>
                      <span>{label}</span>
                      <div className="mf-dual-score-bar"><i style={{ width: `${value}%` }} data-tone={key === "conflict" ? "caution" : value >= 70 ? "good" : value >= 50 ? "neutral" : "caution"} /></div>
                      <b>{value}</b>
                    </div>
                  );
                })}
              </div>
              <p className="mf-zr-chart-note">分数由八字合盘引擎按结构信号确定性计算(柱位加权),只表示这份报告内部的相对关系趋势,不表达两位明星的现实关系结论。</p>
            </section>

            {sectionDefs.map(({ no, field, sub, anchor }) => {
              const section = content.sections[field];
              return (
                <section className="mf-zr-card" id={anchor} key={field}>
                  <div className="mf-zr-section-head"><span>{no}</span><div><h2>{section.headline}</h2><p>{sub}</p></div></div>
                  <ul className="mf-dual-evidence">
                    {section.basis.map((line, index) => <li key={index}>依据 · {line}</li>)}
                  </ul>
                  <div className="mf-dual-directions">
                    <article><b>A 对 B</b><p>{section.aToB}</p></article>
                    <article><b>B 对 A</b><p>{section.bToA}</p></article>
                  </div>
                  <dl className="mf-dual-layers">
                    <div><dt>相处表现</dt><dd>{section.behavior}</dd></div>
                    <div><dt>风险提醒</dt><dd>{section.risk}</dd></div>
                    <div><dt>行动建议</dt><dd>{section.advice}</dd></div>
                  </dl>
                </section>
              );
            })}

            <section className="mf-zr-card" id="d-basis">
              <div className="mf-zr-section-head"><span>09</span><div><h2>命理依据</h2><p>结论来自这些合盘结构,附白话解释与依据强度</p></div></div>
              <dl className="mf-dual-basis">
                {content.basis.map((item, index) => (
                  <div key={index}>
                    <dt>{item.term}<em className={`is-${item.confidence}`}>{CONF_LABELS[item.confidence] ?? item.confidence}</em></dt>
                    <dd>{item.plain}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div id="d-ask">
              <StarAskFloat starId={report.id} starName={`${starA.name} × ${starB.name}`} suggestions={ASK_SUGGESTIONS} metered={metered} reportType="dual" />
            </div>

            <p className="mf-zr-note">本报告基于公开出生资料与八字合盘规则生成,评分与结论由确定性引擎与 AI 解读共同产出,仅用于娱乐和自我探索,不代表当事人的现实关系或真实态度。</p>
          </>
        );
      })()}
    </div>
  );
}
