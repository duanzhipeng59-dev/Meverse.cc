import type { DualReading } from "../../../myfate-dual-reading";
import { ReadableText } from "./static-reading-report";

// 双人合盘九章渲染:与个人报告同款卡片/小节视觉,章节名与顺序固定。
const ORDER: Array<{ key: keyof DualReading["sections"]; no: string; title: string }> = [
  { key: "overview", no: "01", title: "合盘总览" },
  { key: "profiles", no: "02", title: "双方底色" },
  { key: "attraction", no: "03", title: "吸引来源" },
  { key: "dynamics", no: "04", title: "相处模式" },
  { key: "friction", no: "05", title: "摩擦与化解" },
  { key: "intimacy", no: "06", title: "亲密与责任" },
  { key: "collaboration", no: "07", title: "事业财富协作" },
  { key: "family", no: "08", title: "家庭六亲" },
  { key: "rhythm", no: "09", title: "未来节奏" },
];

export default function DualReadingReport({ content }: { content: DualReading }) {
  return (
    <>
      {ORDER.map(({ key, no, title }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head"><span>{no}</span><div><h2>{title}</h2></div></div>
            <div className="mf-rr-blocks">
              {section.insights.map((item, index) => (
                <div className="mf-rr-block" key={`${item.label}-${index}`}>
                  <em>{item.label}</em><p><ReadableText text={item.content} /></p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
