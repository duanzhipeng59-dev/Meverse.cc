import type { StaticReading } from "../../../myfate-static-reading";

const ORDER: Array<{ key: keyof StaticReading["sections"]; no: string }> = [
  { key: "portrait", no: "01" },
  { key: "pattern", no: "02" },
  { key: "education", no: "03" },
  { key: "career", no: "04" },
  { key: "wealth", no: "05" },
  { key: "relationship", no: "06" },
  { key: "wellbeing", no: "07" },
  { key: "family", no: "08" },
];

// 八章静态命局解读:summary + insights + advice,依据与第九章证据目录自 v2 起不再展示。
export default function StaticReadingReport({ content, showAdvice = true }: { content: StaticReading; showAdvice?: boolean }) {
  return (
    <>
      {ORDER.map(({ key, no }) => {
        const section = content.sections[key];
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head"><span>{no}</span><div><h2>{section.title}</h2><p>静态命局解读</p></div></div>
            <p className="mf-rr-lead">{section.summary}</p>
            <div className="mf-rr-blocks">
              {section.insights.map((item, index) => (
                <div className="mf-rr-block" key={`${item.label}-${index}`}>
                  <em>{item.label}</em><p>{item.content}</p>
                </div>
              ))}
            </div>
            {showAdvice ? <ul className="mf-rr-advice">{section.advice.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
          </section>
        );
      })}
    </>
  );
}
