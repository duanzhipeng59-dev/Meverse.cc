import type { StaticReading } from "./myfate-static-reading";
import { ReadableText } from "./home/reading/[id]/static-reading-report";

// 明星报告可视化渲染器:消费手写 single-full-v3 九章结构,与个人解读的
// StaticReadingReport 同源不同皮——章节卡 + 标签子卡 + 大运时间轴。
const CHAPTERS = [
  { key: "portrait", no: "01", icon: "◐", label: "人生画像" },
  { key: "pattern", no: "02", icon: "❖", label: "格局" },
  { key: "education", no: "03", icon: "✎", label: "学业" },
  { key: "career", no: "04", icon: "◈", label: "事业" },
  { key: "wealth", no: "05", icon: "✦", label: "财富" },
  { key: "relationship", no: "06", icon: "♡", label: "感情" },
  { key: "wellbeing", no: "07", icon: "✚", label: "健康" },
  { key: "children", no: "08", icon: "❀", label: "子女" },
  { key: "family", no: "09", icon: "⊹", label: "六亲" },
] as const;

type ChapterKey = (typeof CHAPTERS)[number]["key"];
type Section = NonNullable<StaticReading["sections"][ChapterKey]>;

// 大运轨迹解析:按分号切段,每段匹配「干支运（N–M岁）描述」;全部段匹配且 ≥3 段
// 才认定为轨迹文本,任何不规整都回退原文渲染,手写格式不受限、内容零丢失。
const STEP_PATTERN = /^(.{1,16}?运)\s*[（(](\d{1,3})\s*[–—\-~至]\s*(\d{1,3})\s*岁[）)]\s*(.+)$/u;

function parseDayunSteps(content: string): Array<{ ganzhi: string; start: number; end: number; note: string }> | null {
  const segments = content.split(/[；;]/u).map((part) => part.trim()).filter(Boolean);
  if (segments.length < 3) return null;
  const steps: Array<{ ganzhi: string; start: number; end: number; note: string }> = [];
  for (const segment of segments) {
    const match = STEP_PATTERN.exec(segment);
    // 干支段必须真实含天干字,防止「这段运（3-5岁）」之类的误判
    if (!match || !/[甲乙丙丁戊己庚辛壬癸]/u.test(match[1])) return null;
    steps.push({ ganzhi: match[1], start: Number(match[2]), end: Number(match[3]), note: match[4].replace(/[。]\s*$/u, "") });
  }
  return steps;
}

function DayunTimeline({ steps }: { steps: NonNullable<ReturnType<typeof parseDayunSteps>> }) {
  return (
    <ol className="mf-sr-timeline" aria-label="大运轨迹">
      {steps.map((step) => (
        <li key={`${step.ganzhi}-${step.start}`}>
          <div className="mf-sr-timeline-head">
            <b>{step.ganzhi}</b>
            <span>{step.start}–{step.end}岁</span>
          </div>
          <p><ReadableText text={step.note} /></p>
        </li>
      ))}
    </ol>
  );
}

function InsightBlock({ item }: { item: Section["insights"][number] }) {
  const steps = parseDayunSteps(item.content);
  return (
    <article className="mf-sr-insight">
      {item.label ? <em>{item.label}</em> : null}
      {steps ? <DayunTimeline steps={steps} /> : <p><ReadableText text={item.content} /></p>}
    </article>
  );
}

export default function StarReadingReport({ content }: { content: StaticReading }) {
  const present = CHAPTERS.filter(({ key }) => Boolean(content.sections[key]));
  return (
    <>
      {present.map(({ key, no, icon, label }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-sr-card" id={`sr-${key}`} key={key}>
            <div className="mf-zr-section-head mf-sr-head">
              <span>{no}</span>
              <div>
                <h2><i aria-hidden="true">{icon}</i>{label}</h2>
              </div>
            </div>
            {section.summary ? <p className="mf-sr-lead"><ReadableText text={section.summary} /></p> : null}
            <div className="mf-sr-insights">
              {section.insights.map((item, index) => <InsightBlock item={item} key={`${item.label}-${index}`} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}
