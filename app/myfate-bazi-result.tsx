import Link from "next/link";
import { useRef } from "react";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziReadingResult } from "./myfate-bazi-types";

const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const ZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const WUXING_COLOR: Record<string, string> = {
  木: "#4E7C59", 火: "#C0392B", 土: "#C9A15A", 金: "#9FB3C8", 水: "#2C4A5E",
};
const PALACE: Record<string, string> = {
  年柱: "祖上 · 早年",
  月柱: "父母 · 青年",
  日柱: "自我 · 中年",
  时柱: "子女 · 晚年",
};

function PaipanTable({ chart }: { chart: BaziChart }) {
  return (
    <section className="mf-bz-paipan">
      <header className="mf-bz-paipan-head">
        <h2>四柱八字</h2>
        <span>{chart.trueSolar.city} · 公历 {chart.trueSolar.birthTime}</span>
      </header>
      <div className="mf-bz-paipan-table">
        {chart.pillars.map((pillar) => (
          <article className={`mf-bz-pillar ${pillar.label === "日柱" ? "is-daymaster" : ""}`} key={pillar.label}>
            <header>
              <b>{pillar.label}</b>
              <small>{PALACE[pillar.label]}</small>
            </header>
            <div className="mf-bz-gan">
              <strong style={{ color: WUXING_COLOR[GAN_WUXING[pillar.ganzhi[0]]] }}>{pillar.ganzhi[0]}</strong>
              <em>{GAN_WUXING[pillar.ganzhi[0]]}</em>
              <small>{pillar.shiShenGan}</small>
            </div>
            <div className="mf-bz-zhi">
              <strong style={{ color: WUXING_COLOR[ZHI_WUXING[pillar.ganzhi[1]]] }}>{pillar.ganzhi[1]}</strong>
              <em>{ZHI_WUXING[pillar.ganzhi[1]]}</em>
            </div>
            <div className="mf-bz-hidegan">
              <small>藏干</small>
              <b>{pillar.hideGan.join(" ")}</b>
              <span>{pillar.hideShiShen.join(" · ")}</span>
            </div>
            <footer>{pillar.naYin}</footer>
          </article>
        ))}
      </div>
      <div className="mf-bz-paipan-foot">
        <span>真太阳时 {chart.trueSolar.adjustedTime}(校正 {chart.trueSolar.totalCorrectionMin} 分钟)</span>
        <span>起运 {chart.daYun.startText}</span>
        <span>当前大运 <b>{chart.currentDaYunGanZhi || "尚未起运"}</b> · 流年 {chart.currentYearGanZhi}</span>
      </div>
    </section>
  );
}

function WuXingBars({ wuXing }: { wuXing: Record<string, number> }) {
  const total = Math.max(Object.values(wuXing).reduce((a, b) => a + b, 0), 1);
  return (
    <div className="mf-bz-wuxing">
      {Object.entries(wuXing).map(([element, count]) => (
        <div key={element}>
          <i style={{ color: WUXING_COLOR[element], borderColor: WUXING_COLOR[element] }}>{element}</i>
          <div className="mf-bz-wuxing-bar"><span style={{ width: `${(count / total) * 100}%`, background: WUXING_COLOR[element] }} /></div>
          <b>{Math.round((count / total) * 100)}%</b>
        </div>
      ))}
    </div>
  );
}

function DaYunTimeline({ chart }: { chart: BaziChart }) {
  const scroller = useRef<HTMLOListElement | null>(null);
  const slide = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  };
  return (
    <div className="mf-bz-dayun-slider">
      <button type="button" className="mf-bz-dayun-arrow is-prev" onClick={() => slide(-1)} aria-label="向左查看更早大运">‹</button>
      <ol className="mf-bz-dayun" ref={scroller}>
        {chart.daYun.steps.map((step) => (
          <li key={step.ganzhi + step.startYear} className={step.current ? "is-current" : ""}>
            <b>{step.ganzhi}</b>
            <span>{step.startYear}–{step.endYear}</span>
            <small>{step.startAge}–{step.endAge} 岁</small>
            {step.current ? <em>当前大运</em> : null}
          </li>
        ))}
      </ol>
      <button type="button" className="mf-bz-dayun-arrow is-next" onClick={() => slide(1)} aria-label="向右查看更晚大运">›</button>
    </div>
  );
}

export function BaziChartSections({ chart }: { chart: BaziChart }) {
  return (
    <>
      <PaipanTable chart={chart} />
      <div className="mf-bz-two-col">
        <section className="mf-bz-panel">
          <h3>五行结构</h3>
          <WuXingBars wuXing={chart.wuXing} />
        </section>
        <section className="mf-bz-panel">
          <h3>大运时间轴</h3>
          <DaYunTimeline chart={chart} />
        </section>
      </div>
    </>
  );
}

export default function MyfateBaziResult({ result, actions }: { result: BaziReadingResult; actions?: React.ReactNode }) {
  const chart = result.chart;
  return (
    <div className="mf-bz-result">
      <header className="mf-bz-pagehead">
        <div>
          <span>MYFATE · 个人八字解读</span>
          <h1>命盘解读报告</h1>
          <p>{result.gender === "male" ? "乾造" : "坤造"} · {chart.trueSolar.city} · 公历 {chart.trueSolar.birthTime} · 生成于 {new Date().toLocaleDateString("zh-CN")}</p>
        </div>
        <button type="button" className="mf-bz-export" onClick={() => window.print()}>导出报告</button>
      </header>

      <section className="mf-bz-hero">
        <div className="mf-bz-hero-copy">
          <h2>{result.headline}</h2>
          <p>{result.summary}</p>
        </div>
        <dl className="mf-bz-hero-meta">
          <div><dt>真太阳时</dt><dd>{chart.trueSolar.adjustedTime}</dd></div>
          <div><dt>起运</dt><dd>{chart.daYun.startText}</dd></div>
          <div><dt>当前大运</dt><dd>{chart.currentDaYunGanZhi || "尚未起运"}</dd></div>
        </dl>
      </section>

      <BaziChartSections chart={chart} />

      <section className="mf-bz-sections">
        <h3>八大板块解读</h3>
        <div className="mf-bz-section-grid">
          {result.sections.map((section, index) => (
            <article key={section.id}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><h4>{section.title}</h4></header>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="mf-bz-disclaimer">本解读基于子平八字体系，由排盘计算数据结合 AI 生成，仅供传统文化娱乐与自我观察参考，不构成医疗、财务或人生决策依据。</p>
      <div className="mf-result-actions">{actions ?? <Link className="mf-secondary-button" href="/home/personal-reading">返回个人解读</Link>}</div>
    </div>
  );
}
