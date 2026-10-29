import type { ReactNode } from "react";
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

// 结论关键词表:旺衰(身强/身弱/从势)、格局名、学历档、财富档、职位、健康系统、子女缘分等,
// 以主题色加粗标出便于速读;长词在前保证优先整词匹配,三类报告共用。
const KEYWORD_PATTERN = /(\d+万[–—~至-]\d+万|[一二三四五六七八九十]+千万至[一二三四五六七八九十]+千万|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]大运[（(]\d{1,3}[–—~-]\d{1,3}岁[）)](?:[：:]\d{1,3}分)?|(?:19|20)\d{2}年[（(][甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][）)](?:·\s*评分\d{1,3}分)?|(?:极适合|更适合|适合)?(?:居于|担任|坐上|做到)[^,，。；;]*(?:一把手|二把手)[^,，。；;]*|核心项目分红|婚姻稳定性偏(?:高|中等|低)|高门槛业务|长线复利|缘分(?:很深|偏深|中等|偏浅|较浅)|正印格|偏印格|正官格|七杀格|正财格|偏财格|食神格|伤官格|比肩格|劫财格|从势格|重点本科|普通本科|生男孩|生女孩|一把手|二把手|泌尿系统|心脑血管|呼吸系统|(?<!\d)985(?!\d)|(?<!\d)211(?!\d)|硕士|博士|专科|脾胃|肾脏|肝胆|颈椎|腰椎|内分泌|免疫力|百万(?:中下|中等|中上|偏上|级)|千万(?:中下|中等|中上|偏上|级)|亿万(?:中下|中等|中上|偏上|级)|复利|身强|身弱|从势)/u;
function highlightKeywords(text: string): ReactNode {
  const parts = text.split(KEYWORD_PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (index % 2 === 1 ? <b className="mf-rr-strength" key={index}>{part}</b> : part));
}

export function ReadableText({ text }: { text: string }) {
  // 条目标记起段:条目式年份("2026年（丙午）· 标签：")与干支大运("戊申大运（8–17岁）：55分。…")各成一段,
  // 不依赖句数配对(大运描述多一句就会整体错位);句内枚举年份("2028戊申、2030庚戌…")没有条目标记,不拆分。
  const yearParts = text.split(/(?=(?:(?:19|20)\d{2}\s*年?\s*(?:[（(]|[（(]?\s*[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]\s*[·：:（(])|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]大运[（(]))/u).map((part) => part.trim()).filter(Boolean);
  if (yearParts.length > 1) {
    return <>{yearParts.map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{highlightKeywords(part)}</span>)}</>;
  }
  const sentences = text.split(/(?<=[。！？])/).map((part) => part.trim()).filter(Boolean);
  const parts: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) parts.push(sentences.slice(index, index + 2).join(""));
  // 散文段落:关键词高亮只落在首段(结论段),推导链条/展开解释等后续段落保持原色
  return <>{(parts.length > 1 ? parts : [text]).map((part, index) => <span className="mf-rr-paragraph" key={`${index}-${part.slice(0, 8)}`}>{index === 0 ? highlightKeywords(part) : part}</span>)}</>;
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
            <div className="mf-zr-section-head"><span>{no}</span><div><h2>{SECTION_TITLE[key]}</h2></div></div>
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
