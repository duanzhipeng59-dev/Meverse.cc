import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import RawReportMarkdown from "../../../components/raw-report-markdown";
import BaziMatchReportView from "./bazi-match-report";
import { baziMatchReportSchema } from "../../../myfate-bazi-dual-report";
import ReportTopbar from "../../../report-topbar";
import ReadingGenerating from "./reading-generating";
import { requirePageUser } from "../../../require-page-user";
import { getReadingReport, importSharedReadingReport, type ReadingSubject } from "../../../myfate-reading-server";
import { dualReportSchema, withPersonNames, type DualReportContent } from "../../../myfate-dual-legacy";
import { staticReadingSchema } from "../../../myfate-static-reading";
import StaticReadingReport from "./static-reading-report";
import StarAskPanel from "../../relationship-test/[id]/test/ask-panel";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { vedicCities } from "../../../myfate-cities";
import FailedReading from "./failed-reading";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "解读报告 · MeVerse" };

const DUAL_SECTIONS: Array<{ key: keyof DualReportContent["sections"]; no: string; title: string }> = [
  { key: "attraction", no: "02", title: "核心吸引来源" },
  { key: "communication", no: "03", title: "情绪与沟通方式" },
  { key: "intimacy", no: "04", title: "亲密关系模式" },
  { key: "conflict", no: "05", title: "冲突触发点" },
  { key: "career", no: "06", title: "事业与资源协作" },
  { key: "longterm", no: "07", title: "长期关系潜力" },
];

function SectionCard({ no, title, sub, children }: { no: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mf-zr-card mf-rr-card">
      <div className="mf-zr-section-head"><span>{no}</span><div><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</div></div>
      {children}
    </section>
  );
}

export default async function ReadingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/home/reading/${id}`);
  const report = await getReadingReport(id);
  if (!report) notFound();
  // 分享访问:链接持有者(登录用户)可查看;非所有者首次打开时,把报告复制进 TA 的解读记录以便反复观看
  if (report.userId !== user.id) {
    if (report.status !== "ready") notFound();
    after(async () => {
      await importSharedReadingReport(user.id, report).catch(() => undefined);
    });
  }

  const subjectA = report.subjectA as ReadingSubject;
  const subjectB = report.subjectB as ReadingSubject | null;
  const title = subjectB ? `${subjectA.name} × ${subjectB.name}` : subjectA.name;
  const singleChart = report.mode === "single" ? buildBaziChart({
    birthDate: subjectA.birthDate,
    birthTime: subjectA.birthTime,
    gender: subjectA.gender,
    city: vedicCities.find((city) => city.id === subjectA.cityId) ?? { id: subjectA.cityId, name: subjectA.cityName, lat: 37.5665, lon: 126.978, tz: "Asia/Shanghai" },
  }) : null;
  const singleDisplayName = subjectA.name.trim() && subjectA.name.trim() !== "本人"
    ? subjectA.name.trim()
    : (() => {
      const [year, month, day] = subjectA.birthDate.split("-");
      return `${year}年${month}月${day}日`;
    })();
  const singleTopbarTitle = report.mode === "single" ? singleDisplayName : title;
  const singleTopbarSubtitle = report.mode === "single" && singleChart
    ? singleChart.pillars.map((pillar) => pillar.ganzhi).join(" ")
    : undefined;

  return (
    <div className="mf-zr">
      <ReportTopbar backHref="/home/dual-star-match" backLabel="返回解读页" title={singleTopbarTitle} subtitle={singleTopbarSubtitle} showShare={report.status === "ready"} shareTitle={`${singleTopbarTitle}的八字解读`} />

      {report.status !== "ready" ? (
        report.status === "failed" ? <FailedReading mode={report.mode} subjectA={subjectA} subjectB={subjectB} /> : <ReadingGenerating reportId={report.id} />
      ) : report.mode === "single" ? (() => {
        const parsed = staticReadingSchema.safeParse(report.content);
        if (!parsed.success) notFound();
        return (
          <>
            <StaticReadingReport content={parsed.data} showAdvice={false} />
            <div id="ask"><StarAskPanel starId={report.id} starName={singleDisplayName} reportType="reading-single" suggestions={["我的格局在事业上怎么落地？", "我在合作中最需要注意什么？", "感情相处有什么建议？"]} /></div>
            <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读，量化评分与财富区间为结构信号的估算表达，仅供娱乐与自我观察参考，不构成医疗、法律或投资建议。</p>
          </>
        );
      })() : (() => {
        if (typeof report.content === "string") {
          return <article className="mf-zr-card mf-rr-card mf-raw-report"><RawReportMarkdown content={report.content} /></article>;
        }
        const baziMatch = baziMatchReportSchema.safeParse(report.content);
        if (baziMatch.success) return <BaziMatchReportView report={baziMatch.data} />;
        const parsed = dualReportSchema.safeParse(report.content);
        if (!parsed.success) notFound();
        const content = parsed.data;
        // AI 文案归一:残留的 A/B 代称替换为两人姓名
        const nameOf = (t: string) => withPersonNames(t, subjectA.name, subjectB?.name ?? "B");
        for (const def of DUAL_SECTIONS) {
          const sec = content.sections[def.key];
          if (!sec) continue;
          sec.headline = nameOf(sec.headline);
          sec.aToB = nameOf(sec.aToB); sec.bToA = nameOf(sec.bToA);
          sec.behavior = nameOf(sec.behavior); sec.risk = nameOf(sec.risk); sec.advice = nameOf(sec.advice);
          sec.basis = sec.basis.map(nameOf);
        }
        content.summary = nameOf(content.summary);
        if (content.future_rhythm) {
          for (const stage of [...content.future_rhythm.supportive_periods, ...content.future_rhythm.pressure_periods]) {
            stage.label = nameOf(stage.label); stage.detail = nameOf(stage.detail);
          }
        }
        content.basis = content.basis.map((item) => ({ ...item, term: nameOf(item.term), plain: nameOf(item.plain) }));
        return (
          <>
            <section className="mf-zr-card mf-rr-card">
              <div className="mf-zr-section-head"><span>01</span><div><h2>关系总览</h2><p>{title}</p></div></div>
              <p className="mf-rr-lead">{content.summary}</p>
              <p className="mf-rr-tags">{content.keywords.join(" · ")}</p>
            </section>

            {DUAL_SECTIONS.map((def) => {
              const section = content.sections[def.key];
              if (!section) return null;
              return (
                <SectionCard key={def.key} no={def.no} title={section.headline} sub={def.title}>
                  <div className="mf-rr-blocks">
                    <div className="mf-rr-block"><em>{subjectA.name} → {subjectB?.name}</em><p>{section.aToB}</p></div>
                    <div className="mf-rr-block"><em>{subjectB?.name} → {subjectA.name}</em><p>{section.bToA}</p></div>
                    <div className="mf-rr-block"><em>相处表现</em><p>{section.behavior}</p></div>
                    <div className="mf-rr-block"><em>风险提醒</em><p>{section.risk}</p></div>
                    <div className="mf-rr-block"><em>行动建议</em><p>{section.advice}</p></div>
                  </div>
                </SectionCard>
              );
            })}

            {content.future_rhythm && (content.future_rhythm.supportive_periods.length > 0 || content.future_rhythm.pressure_periods.length > 0) ? (
              <SectionCard no="08" title="未来关系节奏" sub={content.available_time_range ? `可分析区间 ${content.available_time_range.start_year}–${content.available_time_range.end_year}` : undefined}>
                <div className="mf-rr-rhythm">
                  <div><h3>支持阶段</h3>{content.future_rhythm.supportive_periods.map((stage, index) => (
                    <div className="mf-rr-stage is-good" key={index}><b>{stage.start_year === stage.end_year ? stage.start_year : `${stage.start_year}–${stage.end_year}`}</b><em>{stage.label}</em><span>{stage.detail}</span></div>
                  ))}</div>
                  <div><h3>压力阶段</h3>{content.future_rhythm.pressure_periods.map((stage, index) => (
                    <div className="mf-rr-stage is-warn" key={index}><b>{stage.start_year === stage.end_year ? stage.start_year : `${stage.start_year}–${stage.end_year}`}</b><em>{stage.label}</em><span>{stage.detail}</span></div>
                  ))}</div>
                </div>
              </SectionCard>
            ) : null}

            <div id="ask"><StarAskPanel starId={report.id} starName={`${subjectA.name} × ${subjectB?.name ?? ""}`} reportType="reading-dual" suggestions={["我们最大的互补点是什么？", "压力阶段相处要注意什么？", "怎么让关系节奏更顺？"]} /></div>
            <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读,量化评分与财富区间为结构信号的估算表达,仅供娱乐与自我观察参考,不构成医疗、法律或投资建议。</p>
          </>
        );
      })()}
    </div>
  );
}
