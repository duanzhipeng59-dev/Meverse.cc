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

const SECTION_TITLE: Record<string, string> = {
  portrait: "人生画像",
  pattern: "格局",
  education: "学业",
  career: "事业",
  wealth: "财富",
  relationship: "感情婚姻",
  wellbeing: "健康",
  children: "子女",
  family: "六亲",
};

export function ReadableText({ text }: { text: string }) {
  // 条目式年份（"2026年（丙午）· 标签：""2026 丙午：…""2026（丙午）…"）按每个年份单独成段;
  // 句内枚举年份（"2028戊申、2030庚戌、2031辛亥年……"）没有条目标记，不拆分，避免碎段。
  const yearParts = text.split(/(?=(?:19|20)\d{2}\s*年?\s*(?:[（(]|[（(]?\s*[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]\s*[·：:（(]))/).map((part) => part.trim()).filter(Boolean);
  if (yearParts.length > 1) {
    return <>{yearParts.map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{part}</span>)}</>;
  }
  const sentences = text.split(/(?<=[。！？])/).map((part) => part.trim()).filter(Boolean);
  const parts: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) parts.push(sentences.slice(index, index + 2).join(""));
  return <>{(parts.length > 1 ? parts : [text]).map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{part}</span>)}</>;
}

// 九大板块解读:固定章节名+模型个性化标题,内容为模型输出原样呈现。
export default function StaticReadingReport({ content, showAdvice = true }: { content: StaticReading; showAdvice?: boolean }) {
  return (
    <>
      {ORDER.map(({ key, no }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head"><span>{no}</span><div><h2>{SECTION_TITLE[key]}</h2><p>{section.title}</p></div></div>
            <div className="mf-rr-blocks">
              {section.insights.map((item, index) => (
                <div className="mf-rr-block" key={`${item.label}-${index}`}>
                  <em>{item.label}</em><p><ReadableText text={item.content} /></p>
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
