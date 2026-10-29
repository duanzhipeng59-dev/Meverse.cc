import type { ReactNode } from "react";
import type { StaticReading } from "../../../myfate-static-reading";

const ORDER: Array<{ key: keyof StaticReading["sections"]; icon: string }> = [
  { key: "portrait", icon: "◐" },
  { key: "pattern", icon: "❖" },
  { key: "education", icon: "✎" },
  { key: "career", icon: "◈" },
  { key: "wealth", icon: "✦" },
  { key: "relationship", icon: "♡" },
  { key: "wellbeing", icon: "✚" },
  { key: "children", icon: "❀" },
  { key: "family", icon: "⊹" },
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

// 重点标注:①模型按生成规则用「」包裹的核心结论字段(旺衰/格局/学历档/量级/健康系统等);
// ②条目类段落的固定条头(干支大运（N–M岁）：N分。/ YYYY年（干支）· 标签：)。
// 按结构标记走、不依赖内容词表,三类报告共用。
const GAN = "[甲乙丙丁戊己庚辛壬癸]";
const ZHI = "[子丑寅卯辰巳午未申酉戌亥]";
const MARK_PATTERN = new RegExp(
  `(${GAN}${ZHI}大运[（(]\\d{1,3}[–—\\-~至]\\d{1,3}岁[^（）()]*[）)]\\s*[：:](?:[^。。]{1,14}。。?)?` +
  `|(?:19|20)\\d{2}年[（(]${GAN}${ZHI}[）)](?:\\s*·\\s*[^：:，。]{1,14})?[：:]` +
  `|「[^」]{1,24}」)`,
  "gu",
);
function highlightMarks(text: string): ReactNode {
  const parts = text.split(MARK_PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (index % 2 === 1 ? <b className="mf-rr-strength" key={index}>{part}</b> : part));
}

export function ReadableText({ text }: { text: string }) {
  // 条目标记起段:条目式年份("2026年（丙午）· 标签：")与干支大运("戊申大运（8–17岁）：55分。…")各成一段,
  // 不依赖句数配对(大运描述多一句就会整体错位);句内枚举年份("2028戊申、2030庚戌…")没有条目标记,不拆分。
  const yearParts = text.split(/(?=(?:(?:19|20)\d{2}\s*年?\s*(?:[（(]|[（(]?\s*[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]\s*[·：:（(])|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]大运[（(]))/u).map((part) => part.trim()).filter(Boolean);
  if (yearParts.length > 1) {
    return <>{yearParts.map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{highlightMarks(part)}</span>)}</>;
  }
  const sentences = text.split(/(?<=[。！？])/).map((part) => part.trim()).filter(Boolean);
  const parts: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) parts.push(sentences.slice(index, index + 2).join(""));
  // 散文段落:关键词高亮只落在首段(结论段),推导链条/展开解释等后续段落保持原色
  return <>{(parts.length > 1 ? parts : [text]).map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{highlightMarks(part)}</span>)}</>;
}

// 九大板块解读:固定章节名+模型个性化标题,内容为模型输出原样呈现。
export default function StaticReadingReport({ content, showAdvice = true }: { content: StaticReading; showAdvice?: boolean }) {
  return (
    <>
      {ORDER.map(({ key, icon }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head mf-sr-head"><div><h2><i aria-hidden="true">{icon}</i>{SECTION_TITLE[key]}</h2></div></div>
            <div className="mf-rr-blocks">
              {section.insights.map((item, index) => (
                <div className="mf-rr-block" key={`${item.label}-${index}`}>
                  <p>{item.label ? <em>{item.label}</em> : null}<ReadableText text={item.content} /></p>
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
