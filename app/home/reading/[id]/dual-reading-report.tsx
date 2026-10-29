import type { DualReading } from "../../../myfate-dual-reading";
import { ReadableText } from "./static-reading-report";

// 双人合盘九章渲染:与个人报告同款卡片/小节视觉,章节名与顺序固定。
const ORDER: Array<{ key: keyof DualReading["sections"]; title: string }> = [
  { key: "overview", title: "合盘总览" },
  { key: "profiles", title: "双方底色" },
  { key: "attraction", title: "吸引来源" },
  { key: "dynamics", title: "相处模式" },
  { key: "friction", title: "摩擦与化解" },
  { key: "intimacy", title: "亲密与责任" },
  { key: "collaboration", title: "事业财富协作" },
  { key: "family", title: "家庭六亲" },
  { key: "rhythm", title: "未来节奏" },
];

export default function DualReadingReport({ content }: { content: DualReading }) {
  return (
    <>
      {ORDER.map(({ key, title }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-rr-card" key={key}>
            <div className="mf-zr-section-head"><div><h2>{title}</h2></div></div>
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
