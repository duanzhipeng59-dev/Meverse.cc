import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import StarAskFloat from "../test/star-ask-float";
import ReportTopbar from "../../../../report-topbar";
import ReportToc from "../../../../report-toc";
import { getAstrologyReport } from "../../../../myfate-astrology-engine";
import { getCelebrityVedicBirth, getPublishedStar, recordStarReportView } from "../../../../myfate-stars-server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ZODIAC = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_SYMBOL: Record<string, string> = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇" };
const ASK_SUGGESTIONS = [
  "TA 的太阳、月亮和上升有什么矛盾？",
  "TA 在感情里真正需要什么？",
  "命盘里最强的天赋和课题是什么？",
];

type AstroStyle = CSSProperties & { "--astro-angle": string; "--zodiac-index"?: number };

export default async function AstrologyReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams;
  const user = await requirePageUser(`/home/relationship-test/${id}/astrology`);
  const star = await getPublishedStar(id);
  if (!star) notFound();
  const birth = await getCelebrityVedicBirth(id);
  const metered = await isUpgradesEnabled();
  void recordStarReportView(user.id, id, "astrology");

  let report;
  try {
    report = await getAstrologyReport({
      name: star.name,
      birthDate: birth?.birthDate ?? star.birthDate,
      birthTime: birth?.birthTime,
      lat: birth?.lat ?? 37.57,
      lon: birth?.lon ?? 126.98,
      tz: birth?.tz ?? "Asia/Seoul",
      timeKnown: Boolean(birth?.birthTime),
    });
  } catch (error) {
    console.error("Failed to build astrology report", error);
    return (
      <div className="mf-astro">
        <ReportTopbar starId={id} fromReports={from === "reports"} />
        <section className="mf-astro-error"><span>✦</span><h1>星盘正在重新校准</h1><p>计算服务暂时没有返回完整盘面，请稍后刷新重试。</p><Link className="mf-primary-button" href={`/home/relationship-test/${id}/astrology`}>重新生成</Link></section>
      </div>
    );
  }

  const wheelPlanets = report.planets.filter((planet) => PLANET_SYMBOL[planet.key]);
  const maxElement = Math.max(1, ...report.elements.map((item) => item.value));
  const maxModality = Math.max(1, ...report.modalities.map((item) => item.value));

  return (
    <div className="mf-astro">
      <ReportTopbar starId={id} fromReports={from === "reports"} />

      <header className="mf-astro-hero">
        <Image src={star.portraitSrc} alt={star.name} width={92} height={112} sizes="92px" unoptimized />
        <div><span>WESTERN NATAL CHART</span><h1>{star.name} 的 AI 星盘解读</h1><p>从行星、宫位、相位与格局，理解 TA 的人格结构、情感方式和人生动力。</p><small>{star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {report.timeKnown ? "出生时间已确认" : "出生时间未确认，已隐藏上升与宫位结论"}</small></div>
      </header>

      <ReportToc items={[
        { id: "astro-chart", label: "星盘" },
        { id: "astro-core", label: "人格" },
        { id: "astro-themes", label: "主题" },
        { id: "astro-aspects", label: "相位" },
        { id: "astro-houses", label: "宫位" },
        { id: "astro-ask", label: "AI 追问" },
      ]} />

      <section className="mf-astro-card" id="astro-chart">
        <div className="mf-zr-section-head"><span>01</span><div><h2>本命星盘</h2><p>行星落座、角度与能量分布</p></div></div>
        <div className="mf-astro-chart-layout">
          <div className="mf-astro-wheel" aria-label="本命星盘轮盘">
            <i className="ring one" /><i className="ring two" /><i className="axis a" /><i className="axis b" />
            {ZODIAC.map((symbol, index) => <span className="mf-astro-zodiac" style={{ "--astro-angle": `${index * 30}deg` } as AstroStyle} key={symbol}>{symbol}</span>)}
            {wheelPlanets.map((planet) => <span className="mf-astro-planet" style={{ "--astro-angle": `${planet.longitude}deg` } as AstroStyle} title={planet.label + " " + planet.sign} key={planet.key}><b>{PLANET_SYMBOL[planet.key]}</b></span>)}
            <div className="mf-astro-wheel-core"><b>{report.bigThree[0]?.sign}</b><small>太阳</small></div>
          </div>
          <div className="mf-astro-planet-list">
            {report.planets.slice(0, 10).map((planet) => <div key={planet.key}><b>{PLANET_SYMBOL[planet.key] || "•"} {planet.label}</b><span>{planet.sign} {planet.degree.toFixed(1)}°{planet.house ? ` · ${planet.house}宫` : ""}{planet.retrograde ? " · 逆行" : ""}</span></div>)}
          </div>
        </div>
        <div className="mf-zr-foundation">{report.chartMeta.map((item) => <div key={item.label}><small>{item.label}</small><b>{item.value}</b></div>)}</div>
        <p className="mf-zr-chart-note">引擎 {report.source.repository} · {report.source.houseSystem} · {report.source.precision}</p>
      </section>

      <section className="mf-astro-card" id="astro-core">
        <div className="mf-zr-section-head"><span>02</span><div><h2>人格三核心</h2><p>太阳、月亮与上升共同构成人格主轴</p></div></div>
        <div className="mf-astro-big-three">{report.bigThree.map((item) => <article key={item.key}><span>{item.label}</span><b>{item.sign}{typeof item.degree === "number" ? ` ${item.degree.toFixed(1)}°` : ""}</b><p>{item.text}</p></article>)}</div>
        <div className="mf-astro-balance">
          <div><h3>四元素</h3>{report.elements.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${Math.round(item.value / maxElement * 100)}%` }} /></i><small>{item.value}</small></div>)}</div>
          <div><h3>三模式</h3>{report.modalities.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${Math.round(item.value / maxModality * 100)}%` }} /></i><small>{item.value}</small></div>)}</div>
        </div>
      </section>

      <section className="mf-astro-card" id="astro-themes">
        <div className="mf-zr-section-head"><span>03</span><div><h2>人生主题解读</h2><p>从真实落点提炼人格、关系、事业与成长主线</p></div></div>
        <div className="mf-astro-sections">{report.sections.map((section) => <article key={section.title}><h3>{section.title}</h3><p>{section.summary}</p><ul>{section.evidence.map((line) => <li key={line}>{line}</li>)}</ul></article>)}</div>
      </section>

      <section className="mf-astro-card" id="astro-aspects">
        <div className="mf-zr-section-head"><span>04</span><div><h2>相位与星盘格局</h2><p>天赋来自顺畅连接，成长来自张力结构</p></div></div>
        {report.patterns.length ? <><h3 className="mf-zr-sub">主要格局</h3><div className="mf-zr-relation-grid">{report.patterns.map((pattern, index) => <article className={`is-${pattern.tone === "growth" ? "caution" : "good"}`} key={pattern.title + index}><b>{pattern.title}</b><small>{pattern.planets}</small><p>{pattern.text}</p></article>)}</div></> : null}
        <h3 className="mf-zr-sub">紧密相位</h3>
        <div className="mf-astro-aspects">{report.aspects.map((aspect) => <article className={`is-${aspect.tone}`} key={aspect.title}><div><b>{aspect.title}</b><span>容许度 {aspect.orb.toFixed(1)}°</span></div><p>{aspect.text}</p></article>)}</div>
      </section>

      {report.houses.length ? <section className="mf-astro-card" id="astro-houses"><div className="mf-zr-section-head"><span>05</span><div><h2>十二宫位</h2><p>不同人生领域如何展开</p></div></div><div className="mf-astro-houses">{report.houses.map((house) => <article key={house.house}><span>{house.house}</span><div><b>{house.sign}</b><small>宫主星 {house.ruler}</small><p>{house.topic}</p></div></article>)}</div></section> : null}

      {report.specialPoints.length ? <section className="mf-astro-card"><div className="mf-zr-section-head"><span>06</span><div><h2>特殊点与月相</h2><p>补充观察自然顺流、重要相遇和阴影议题</p></div></div><div className="mf-astro-special">{report.specialPoints.map((item) => <article key={item.title}><span>{item.title}</span><b>{item.value}</b><p>{item.text}</p></article>)}</div></section> : null}

      <div id="astro-ask"><StarAskFloat starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} reportType="astrology" /></div>

      <footer className="mf-astro-source"><p>星位由确定性引擎计算。占星属于文化解释体系，不构成科学结论或医疗、法律、投资建议。</p></footer>
    </div>
  );
}
