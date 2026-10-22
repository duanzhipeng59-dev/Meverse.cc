import type { StaticReading } from "../../../myfate-static-reading";

const ORDER: Array<{ key: keyof StaticReading["sections"]; no: string }> = [
  { key: "portrait", no: "01" },
  { key: "pattern", no: "02" },
  { key: "education", no: "03" },
  { key: "career", no: "04" },
  { key: "wealth", no: "05" },
  { key: "relationship", no: "06" },
  { key: "wellbeing", no: "07" },
  { key: "children", no: "08" },
  { key: "family", no: "09" },
];

const TIMELINE_TITLE = { career: "一生事业轨迹", wealth: "一生财富节奏", relationship: "一生婚恋节奏" } as const;
const SECTION_TITLE: Record<string, string> = {
  portrait: "人生画像",
  pattern: "格局",
  education: "学业",
  career: "事业",
  wealth: "财富",
  relationship: "感情",
  wellbeing: "健康",
  children: "子女",
  family: "六亲",
};

// 九大板块静态命局解读:固定竞品式章节名,个性化标题作为副标题保留。
export default function StaticReadingReport({ content, showAdvice = true }: { content: StaticReading; showAdvice?: boolean }) {
  return (
    <>
      {ORDER.map(({ key, no }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head"><span>{no}</span><div><h2>{SECTION_TITLE[key]}</h2><p>{section.title} · 静态命局解读</p></div></div>
            <p className="mf-rr-lead">{section.summary}</p>
            <div className="mf-rr-blocks">
              {section.insights.map((item, index) => (
                <div className="mf-rr-block" key={`${item.label}-${index}`}>
                  <em>{item.label}</em><p>{item.content}</p>
                </div>
              ))}
            </div>
            {showAdvice ? <ul className="mf-rr-advice">{section.advice.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
            {key === "career" || key === "wealth" || key === "relationship" ? (() => {
              const timeline = content.timelines?.[key];
              if (!timeline) return null;
              return (
                <div className="mf-rr-timeline">
                  <h3>{TIMELINE_TITLE[key]}</h3>
                  <ul className="mf-rr-steps">
                    {timeline.dayun.map((item) => (
                      <li key={`${key}-${item.ganzhi}`} className={item.current ? "is-current" : ""}>
                        <b>{item.ganzhi}</b><small>{item.age} · {item.label}{item.score != null ? ` · ${item.score}分` : ""}</small><span>{item.theme} {item.action}</span>
                      </li>
                    ))}
                  </ul>
                  <h3>近期流年</h3>
                  <ul className="mf-rr-years">
                    {timeline.annual.map((item) => (
                      <li key={`${key}-${item.year}`}><b>{item.year} {item.ganzhi}</b><small>{key === "relationship" && item.score != null ? `缘分指数 ${item.score}` : `${item.label}${item.score != null ? ` · ${item.score}分` : ""}`}</small><span>{item.theme} {item.action}</span></li>
                    ))}
                  </ul>
                </div>
              );
            })() : null}
          </section>
        );
      })}
    </>
  );
}
