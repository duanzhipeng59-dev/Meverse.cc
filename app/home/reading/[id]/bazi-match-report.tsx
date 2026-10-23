import type { BaziMatchReport } from "../../../myfate-bazi-dual-report";

const ANALYSIS = [
  ["wuxingNourishment", "五行气场与互补"], ["dayPillarAffinity", "日柱与夫妻宫"],
  ["interactionDynamics", "沟通与相处模式"], ["familyBackground", "家庭背景与接纳度"],
] as const;

export default function BaziMatchReportView({ report }: { report: BaziMatchReport }) {
  const { overview, profiles, analysis, timeline, actionableAdvice } = report;
  return <>
    <section className="mf-zr-card mf-rr-card">
      <div className="mf-zr-section-head"><span>01</span><div><h2>关系总览</h2><p>{overview.matchLevel}</p></div></div>
      <p className="mf-rr-lead">{overview.oneSentenceSummary}</p>
      <p className="mf-rr-tags">{overview.tags.join(" · ")} · 综合匹配度 {overview.matchScore}</p>
      <div className="mf-rr-radar-values">{Object.entries(overview.radar).map(([key, value]) => <span key={key}><b>{value}</b><em>{({ attraction: "吸引力", tacitUnderstanding: "默契度", stability: "稳定性", nourishment: "滋养度", familyAcceptance: "家庭支持" } as Record<string, string>)[key]}</em></span>)}</div>
    </section>
    <section className="mf-zr-card mf-rr-card"><div className="mf-zr-section-head"><span>02</span><div><h2>双方本命底色</h2><p>个体婚恋画像</p></div></div><div className="mf-rr-profile-grid">{[profiles.male, profiles.female].map((person) => <div className="mf-rr-profile" key={person.name}><h3>{person.name}</h3><p>{person.bazi} · {person.dayMaster}</p><p>{person.traits}</p><p>{person.marriagePalace}</p></div>)}</div></section>
    {ANALYSIS.map(([key, label], index) => { const item = analysis[key]; return <section className="mf-zr-card mf-rr-card" key={key}><div className="mf-zr-section-head"><span>{String(index + 3).padStart(2, "0")}</span><div><h2>{label}</h2><p>{item.title} · {item.score}分</p></div></div><p className="mf-rr-lead">{item.description}</p></section>; })}
    <section className="mf-zr-card mf-rr-card"><div className="mf-zr-section-head"><span>07</span><div><h2>时间节律与风险提示</h2><p>关系推进与需要留意的阶段</p></div></div><div className="mf-rr-blocks">{timeline.marriageWindow.map((item) => <div className="mf-rr-block" key={item.year}><em>{item.year}</em><p>{item.significance}</p></div>)}{timeline.riskYears.map((item) => <div className="mf-rr-block" key={item.year}><em>{item.year} · {item.riskLevel}</em><p>{item.reason}<br />化解：{item.mitigation}</p></div>)}</div></section>
    <section className="mf-zr-card mf-rr-card"><div className="mf-zr-section-head"><span>08</span><div><h2>行动建议</h2><p>把关系理解落到日常行动</p></div></div><div className="mf-rr-blocks"><div className="mf-rr-block"><em>给男方</em><ul>{actionableAdvice.toMale.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="mf-rr-block"><em>给女方</em><ul>{actionableAdvice.toFemale.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="mf-rr-block"><em>生活方式调节</em><ul>{actionableAdvice.fengShuiAndLifestyle.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
  </>;
}
