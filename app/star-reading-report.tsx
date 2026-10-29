import type { StaticReading } from "./myfate-static-reading";
import { ReadableText } from "./home/reading/[id]/static-reading-report";

// 明星报告可视化渲染器:消费手写 single-full-v3 九章结构,与个人解读的
// StaticReadingReport 同源不同皮——章节卡 + 标签子卡 + 大运时间轴。
const CHAPTERS = [
  { key: "portrait", icon: "◐", label: "人生画像" },
  { key: "pattern", icon: "❖", label: "格局" },
  { key: "education", icon: "✎", label: "学业" },
  { key: "career", icon: "◈", label: "事业" },
  { key: "wealth", icon: "✦", label: "财富" },
  { key: "relationship", icon: "♡", label: "感情" },
  { key: "wellbeing", icon: "✚", label: "健康" },
  { key: "children", icon: "❀", label: "子女" },
  { key: "family", icon: "⊹", label: "六亲" },
] as const;

type ChapterKey = (typeof CHAPTERS)[number]["key"];
type Section = NonNullable<StaticReading["sections"][ChapterKey]>;

// 大运轨迹解析:按分号切段,每段匹配「干支运（N–M岁）描述」;全部段匹配且 ≥3 段
// 才认定为轨迹文本,任何不规整都回退原文渲染,手写格式不受限、内容零丢失。
const STEP_PATTERN = /^(.{1,16}?运)\s*[（(](\d{1,3})\s*[–—\-~至]\s*(\d{1,3})\s*岁[^）)]*[）)]\s*(.+)$/u;

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

// ── 大运趋势图数据:从九章文本提取事业评分与财富趋势箭头 ──
// 事业轨迹在历代报告中出现过四种写法,按命中数择优:
// A 干支大运（8–17岁[，当前|1995–2004]）：65分  B 干支运（8-17岁，65分）：  C 2003–2012年干支运（65分）：(年份区间,需出生年换算)
const GAN = "[甲乙丙丁戊己庚辛壬癸]";
const ZHI = "[子丑寅卯辰巳午未申酉戌亥]";
const AGE = "(\\d{1,3})\\s*[–—\\-~至]\\s*(\\d{1,3})";
const DAYUN_A = new RegExp(`${GAN}${ZHI}(?:大)?运[（(]${AGE}\\s*岁[^）)]*[）)]\\s*[：:]\\s*(\\d{1,3})分`, "gu");
// 括号内混合式:干支运（[YYYY–YYYY，][N–M岁[，/]]评分?N分?）——年份区间与年龄区间至少有其一
const DAYUN_INNER = new RegExp(`${GAN}${ZHI}(?:大)?运[（(](?:((?:19|20)\\d{2})\\s*[–—\\-~至]\\s*((?:19|20)\\d{2})\\s*[，,]?\\s*)?(?:(\\d{1,3})\\s*[–—\\-~至]\\s*(\\d{1,3})\\s*岁\\s*[，,/]?\\s*)?(?:评分)?\\s*(\\d{1,3})\\s*分?`, "gu");
const DAYUN_C = new RegExp(`((?:19|20)\\d{2})\\s*[–—\\-~至]\\s*((?:19|20)\\d{2})\\s*年\\s*${GAN}${ZHI}(?:大)?运[（(]\\s*(\\d{1,3})\\s*分[^）)]*[）)]`, "gu");
const WEALTH_STEP = new RegExp(`${GAN}${ZHI}(?:大)?运[（(]${AGE}\\s*岁[^）)]*[）)]\\s*[：:]\\s*财运状态[（(](↑↑|↑|→|↓|↓↓)[）)]`, "gu");
const WEALTH_TREND: Record<string, string> = { "↑↑": "强劲 ↑↑", "↑": "向好 ↑", "→": "平稳 →", "↓": "承压 ↓", "↓↓": "承压 ↓" };

export function extractFortuneData(content: StaticReading, birthYear?: number) {
  const texts = content.sections.career?.insights.map((item) => item.content) ?? [];
  const text = texts.find((t) => /运[（(]/u.test(t));
  if (!text) return null;
  type Pt = { start: number; end: number; score: number; current: boolean };
  const collect = (pattern: RegExp, toPoint: (m: RegExpMatchArray) => Pt | null) =>
    Array.from(text.matchAll(pattern)).map(toPoint).filter((p): p is Pt => p !== null);
  let points = collect(DAYUN_A, (m) => ({ start: Number(m[1]), end: Number(m[2]), score: Number(m[3]), current: m[0].includes("当前") }));
  if (points.length < 3) points = collect(DAYUN_INNER, (m) => {
    const score = Number(m[5]);
    if (score > 100) return null; // 括号内是年份等非分数内容
    let start = m[3] !== undefined ? Number(m[3]) : null;
    let end = m[4] !== undefined ? Number(m[4]) : null;
    if (start === null && m[1] !== undefined && birthYear) {
      start = Number(m[1]) - birthYear;
      end = Number(m[2]) - birthYear;
    }
    if (start === null || end === null || start < 1 || end > 120 || end - start > 30) return null;
    return { start, end, score, current: m[0].includes("当前") };
  });
  if (points.length < 3 && birthYear) {
    points = collect(DAYUN_C, (m) => {
      const start = Number(m[1]) - birthYear;
      const end = Number(m[2]) - birthYear;
      if (start < 1 || end > 120 || end - start > 30) return null;
      return { start, end, score: Number(m[3]), current: m[0].includes("当前") };
    });
  }
  if (points.length < 3) return null;
  const careerLifetime = points.map((p) => ({ age: `${p.start}–${p.end}`, score: p.score }));
  const current = points.find((p) => p.current);
  // 当前位置:优先用报告里的「当前」标记;文本没写时按出生年推算实际年龄兜底(虚线始终有)
  const currentAge = current
    ? Math.round((current.start + current.end) / 2)
    : birthYear
      ? Math.min(80, Math.max(7, new Date().getFullYear() - birthYear))
      : null;
  const wealthText = content.sections.wealth?.insights.map((item) => item.content).find((t) => t.includes("财运状态"));
  const wealthLifetime: Array<{ age: string; trend: string }> = [];
  if (wealthText) {
    for (const match of wealthText.matchAll(WEALTH_STEP)) {
      wealthLifetime.push({ age: `${match[1]}–${match[2]}`, trend: WEALTH_TREND[match[3]] ?? "平稳 →" });
    }
  }
  return { careerLifetime, wealthLifetime, loveMarriage: [] as Array<{ age: string; tag: string }>, currentAge };
}

export default function StarReadingReport({ content }: { content: StaticReading }) {
  const present = CHAPTERS.filter(({ key }) => Boolean(content.sections[key]));
  return (
    <>
      {present.map(({ key, icon, label }) => {
        const section = content.sections[key];
        if (!section) return null;
        return (
          <section className="mf-zr-card mf-sr-card" id={`sr-${key}`} key={key}>
            <div className="mf-zr-section-head mf-sr-head">
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
