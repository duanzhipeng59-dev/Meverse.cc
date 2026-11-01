"use client";

import type { StaticReading } from "./myfate-static-reading";
import { ReadableText } from "./home/reading/[id]/static-reading-report";
import { useLanguage } from "./language-context";

// 明星报告可视化渲染器:消费手写 single-full-v3 九章结构,与个人解读的
// StaticReadingReport 同源不同皮——章节卡 + 标签子卡 + 大运时间轴。
// 客户端组件:content 由包装层(trad-report-body)按语言做简/繁数据转换后传入,
// 章节标题与时间轴文案走 i18n。
const CHAPTERS = [
  { key: "portrait", icon: "◐", labelKey: "preview.chapter.portrait" },
  { key: "pattern", icon: "❖", labelKey: "preview.chapter.pattern" },
  { key: "education", icon: "✎", labelKey: "preview.chapter.study" },
  { key: "career", icon: "◈", labelKey: "preview.chapter.career" },
  { key: "wealth", icon: "✦", labelKey: "preview.chapter.wealth" },
  { key: "relationship", icon: "♡", labelKey: "preview.chapter.love" },
  { key: "wellbeing", icon: "✚", labelKey: "preview.chapter.health" },
  { key: "children", icon: "❀", labelKey: "preview.chapter.children" },
  { key: "family", icon: "⊹", labelKey: "preview.chapter.family" },
] as const;

type ChapterKey = (typeof CHAPTERS)[number]["key"];
type Section = NonNullable<StaticReading["sections"][ChapterKey]>;

// 大运轨迹解析:按分号切段,每段匹配「干支运（N–M岁）描述」;全部段匹配且 ≥3 段
// 才认定为轨迹文本,任何不规整都回退原文渲染,手写格式不受限、内容零丢失。
// 字符类兼容简繁(运/運、岁/歲):繁中模式下 content 已转换,解析不能失效。
const STEP_PATTERN = /^(.{1,16}?[运運])\s*[（(](\d{1,3})\s*[–—\-~至]\s*(\d{1,3})\s*[岁歲][^）)]*[）)]\s*(.+)$/u;

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
  const { t } = useLanguage();
  return (
    <ol className="mf-sr-timeline" aria-label={t("report.timeline.aria")}>
      {steps.map((step) => (
        <li key={`${step.ganzhi}-${step.start}`}>
          <div className="mf-sr-timeline-head">
            <b>{step.ganzhi}</b>
            <span>{t("report.timeline.age", { start: step.start, end: step.end })}</span>
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

// extractFortuneData(运势数据提取)已拆至 app/star-fortune-extract.ts:
// 本文件是客户端组件,服务端页面不能从这里 import 可执行函数。

export default function StarReadingReport({ content }: { content: StaticReading }) {
  const { t } = useLanguage();
  const present = CHAPTERS.filter(({ key }) => Boolean(content.sections[key]));
  return (
    <>
      {present.map(({ key, icon, labelKey }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-sr-card" id={`sr-${key}`} key={key}>
            <div className="mf-zr-section-head mf-sr-head">
              <div>
                <h2><i aria-hidden="true">{icon}</i>{t(labelKey)}</h2>
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
