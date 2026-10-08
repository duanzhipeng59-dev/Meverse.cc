import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StarAskPanel from "../../../relationship-test/[id]/test/ask-panel";
import ReportTopbar from "../../../../report-topbar";
import ReportToc from "../../../../report-toc";
import DualGenerating from "./dual-generating";
import DualOverrideReport, { type DualIdCard } from "./dual-override-report";
import { getDualOverride } from "../../../../myfate-dual-overrides";
import { getDualReport } from "../../../../myfate-dual-server";
import { getPublishedStar, getCelebrityVedicBirth } from "../../../../myfate-stars-server";
import { buildDualChart } from "../../../../myfate-dual-engine";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";
import { dualReportSchema, type DualReportContent } from "../../../../myfate-dual-generator";
import { portraitImage } from "../../../../myfate-image";

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
  // 认证与报告读取并行(只读无副作用);两者都返回后再做归属校验
  const [user, report] = await Promise.all([requirePageUser(`/home/dual-star-match/reports/${id}`), getDualReport(id)]);
  if (!report || report.userId !== user.id) notFound();
  // 一次并行拿全两位明星/计费开关/出生数据:override 分支要用四柱,提前取省一轮串行往返
  const [starA, starB, metered, birthA, birthB] = await Promise.all([
    getPublishedStar(report.starA),
    getPublishedStar(report.starB),
    isUpgradesEnabled(),
    getCelebrityVedicBirth(report.starA),
    getCelebrityVedicBirth(report.starB),
  ]);
  if (!starA || !starB) notFound();
  // 结构化固定要求:顶栏与卡片只用中文名(从 role 解析),不显示英文艺名
  const personOf = (role: string) => (role.includes("-") ? role.split("-")[1].trim() : "");

  return (
    <div className="mf-zr">
      <ReportTopbar backHref="/home/dual-star-match" backLabel="返回双人合盘" title={`${personOf(starA.role) || starA.name} & ${personOf(starB.role) || starB.name}`} />

      {report.status !== "ready" ? (
        <DualGenerating reportId={report.id} nameA={starA.name} nameB={starB.name} portraitA={portraitImage(starA.portraitSrc, 240)} portraitB={portraitImage(starB.portraitSrc, 240)} />
      ) : (async () => {
        // 精校内容优先:命中组合直接渲染定稿文案,不走 AI 生成结构
        const override = getDualOverride(report.starA, report.starB);
        if (override) {
          // 头部双人身份卡:各自排盘取四柱与出生信息;固定要求只用中文名、不显示「已校准」
          const people = [starA, starB].map((star, index) => {
            const birth = index === 0 ? birthA : birthB;
            const chart = birth ? buildDualChart(birth).chart : null;
            const [group = "", person = ""] = star.role.split("-").map((part) => part.trim());
            return {
              name: person || star.name,
              role: group.replace(" 成员", ""),
              portrait: portraitImage(star.portraitSrc, 240),
              birthLine: `出生 · ${star.birthDate.replaceAll("-", ".")} · ${birth?.birthPlace ?? ""}`,
              pillars: chart ? chart.pillars.map((pillar) => ({ label: pillar.label.replace("柱", ""), ganzhi: pillar.ganzhi })) : [],
            };
          }) as [DualIdCard, DualIdCard];
          return (
            <DualOverrideReport
              content={override}
              people={people}
              reportId={report.id}
              metered={metered}
            />
          );
        }
        const parsed = dualReportSchema.safeParse(report.content);
        if (!parsed.success) notFound();
        const content: DualReportContent = parsed.data;
        // 评分唯一来源:引擎在创建时落库的结构分
        const scores = report.scores ?? {};
        const sectionDefs: Array<{ no: string; field: "attraction" | "communication" | "intimacy" | "conflict" | "career" | "longterm"; sub: string; anchor: string }> = [
          { no: "02", field: "attraction", sub: "吸引点、化学反应与落差", anchor: "d-attraction" },
          { no: "03", field: "communication", sub: "表达差异与情绪需求", anchor: "d-communication" },
          { no: "04", field: "intimacy", sub: "亲近质地与需求匹配", anchor: "d-intimacy" },
          { no: "05", field: "conflict", sub: "摩擦位置与处理方法", anchor: "d-conflict" },
          { no: "06", field: "career", sub: "协作方式与互补点", anchor: "d-career" },
          { no: "07", field: "longterm", sub: "关系持续的条件", anchor: "d-longterm" },
        ];
        // 未来关系节奏:双方流年交集为空或无阶段时整块隐藏;旧版报告回退到时间线章节
        const rhythm = content.future_rhythm;
        const hasRhythm = Boolean(rhythm && (rhythm.supportive_periods.length > 0 || rhythm.pressure_periods.length > 0));
        const legacyTimeline = content.sections.timeline;
        const timeRange = content.available_time_range;
        return (
          <>
            <header className="mf-dual-report-hero">
              <div className="mf-dual-report-people">
                <figure>
                  <Image src={portraitImage(starA.portraitSrc, 240)} alt={starA.name} width={92} height={112} unoptimized />
                  <figcaption>{starA.name}</figcaption>
                </figure>
                <span aria-hidden="true">×</span>
                <figure>
                  <Image src={portraitImage(starB.portraitSrc, 240)} alt={starB.name} width={92} height={112} unoptimized />
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
              ...(hasRhythm || legacyTimeline ? [{ id: "d-timeline", label: hasRhythm ? "节奏" : "时间线" }] : []),
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

            {hasRhythm && rhythm ? (
              <section className="mf-zr-card" id="d-timeline">
                <div className="mf-zr-section-head">
                  <span>08</span>
                  <div>
                    <h2>未来关系节奏</h2>
                    <p>{timeRange ? `双方可分析区间 ${timeRange.start_year}–${timeRange.end_year} · 由两人大运流年数据交集确定` : "双方大运流年窗口"}</p>
                  </div>
                </div>
                <div className="mf-dual-rhythm">
                  {([
                    ["支持阶段", rhythm.supportive_periods],
                    ["压力阶段", rhythm.pressure_periods],
                  ] as const).map(([groupLabel, periods]) => periods.length > 0 ? (
                    <div className={`mf-dual-rhythm-group${groupLabel === "压力阶段" ? " is-pressure" : ""}`} key={groupLabel}>
                      <b>{groupLabel}</b>
                      <div className="mf-dual-periods">
                        {periods.map((period) => (
                          <article className={`mf-dual-period${groupLabel === "压力阶段" ? " is-pressure" : ""}`} key={`${period.start_year}-${period.end_year}`}>
                            <span>{period.start_year === period.end_year ? `${period.start_year}` : `${period.start_year}–${period.end_year}`}</span>
                            <b>{period.label}</b>
                            <p>{period.detail}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null)}
                </div>
                <p className="mf-zr-chart-note">阶段由双方原局、各自大运与流年触发共同归纳,只描述趋势窗口,不预测现实事件。</p>
              </section>
            ) : legacyTimeline ? (
              <section className="mf-zr-card" id="d-timeline">
                <div className="mf-zr-section-head"><span>08</span><div><h2>{legacyTimeline.headline}</h2><p>未来三年关系节奏窗口</p></div></div>
                <ul className="mf-dual-evidence">
                  {legacyTimeline.basis.map((line, index) => <li key={index}>依据 · {line}</li>)}
                </ul>
                <div className="mf-dual-directions">
                  <article><b>A 对 B</b><p>{legacyTimeline.aToB}</p></article>
                  <article><b>B 对 A</b><p>{legacyTimeline.bToA}</p></article>
                </div>
                <dl className="mf-dual-layers">
                  <div><dt>相处表现</dt><dd>{legacyTimeline.behavior}</dd></div>
                  <div><dt>风险提醒</dt><dd>{legacyTimeline.risk}</dd></div>
                  <div><dt>行动建议</dt><dd>{legacyTimeline.advice}</dd></div>
                </dl>
              </section>
            ) : null}

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
              <StarAskPanel starId={report.id} starName={`${starA.name} × ${starB.name}`} suggestions={ASK_SUGGESTIONS} metered={metered} reportType="dual" />
            </div>

            <p className="mf-zr-note">本报告基于公开出生资料与八字合盘规则生成,评分与结论由确定性引擎与 AI 解读共同产出,仅用于娱乐和自我探索,不代表当事人的现实关系或真实态度。</p>
          </>
        );
      })()}
    </div>
  );
}
