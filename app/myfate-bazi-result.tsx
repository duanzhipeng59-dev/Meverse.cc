import Link from "next/link";
import type { BaziReadingResult } from "./myfate-bazi-types";

const WENZHEN_URL = "https://pcbz.iwzwh.com";

function WuXingBars({ wuXing }: { wuXing: Record<string, number> }) {
  const max = Math.max(...Object.values(wuXing), 1);
  return (
    <div className="mf-bazi-wuxing">
      {Object.entries(wuXing).map(([element, count]) => (
        <div key={element}>
          <span>{element}</span>
          <i style={{ width: `${(count / max) * 100}%` }} />
          <b>{count}</b>
        </div>
      ))}
    </div>
  );
}

export default function MyfateBaziResult({ result, actions }: { result: BaziReadingResult; actions?: React.ReactNode }) {
  const chart = result.chart;
  return (
    <div className="mf-formula-result mf-bazi-result">
      <section className="mf-formula-verdict is-relationship-identity">
        <span>MYFATE · 个人八字解读</span>
        <div className="mf-formula-verdict-person"><small>{result.gender === "male" ? "乾造" : "坤造"} · {chart.trueSolar.city}</small></div>
        <p className="mf-identity-lead">你的命盘主轴</p>
        <h1>{result.headline}</h1>
        <p>{result.summary}</p>
        <div className="mf-formula-facts">
          <div><strong>真太阳时</strong><small>{chart.trueSolar.adjustedTime}</small></div>
          <div><strong>起运</strong><small>{chart.daYun.startText}</small></div>
          <div><strong>当前大运</strong><small>{chart.currentDaYunGanZhi || "尚未起运"}</small></div>
        </div>
      </section>

      <section className="mf-bazi-paipan" aria-labelledby="mf-bazi-paipan-title">
        <div className="mf-identity-section-heading">
          <span>排盘结果</span>
          <h2 id="mf-bazi-paipan-title">四柱八字</h2>
          <p>已按真太阳时校准:北京时间 {chart.trueSolar.birthTime} → 真太阳时 {chart.trueSolar.adjustedTime}(经度修正 {chart.trueSolar.longitudeCorrectionMin} 分钟,均时差 {chart.trueSolar.equationOfTimeMin} 分钟)。</p>
        </div>
        <div className="mf-bazi-pillars">
          {chart.pillars.map((pillar) => (
            <article key={pillar.label}>
              <span>{pillar.label}</span>
              <h3>{pillar.ganzhi}</h3>
              <dl>
                <div><dt>天干十神</dt><dd>{pillar.shiShenGan}</dd></div>
                <div><dt>藏干</dt><dd>{pillar.hideGan.map((gan, index) => `${gan}(${pillar.hideShiShen[index] ?? "—"})`).join(" ")}</dd></div>
                <div><dt>纳音</dt><dd>{pillar.naYin}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <WuXingBars wuXing={chart.wuXing} />
      </section>

      <section className="mf-bazi-dayun" aria-labelledby="mf-bazi-dayun-title">
        <div className="mf-identity-section-heading">
          <span>大运时间轴</span>
          <h2 id="mf-bazi-dayun-title">起运 {chart.daYun.startText}</h2>
          <p>每步大运十年,高亮为当前大运;今年流年 {chart.currentYearGanZhi}。</p>
        </div>
        <ol className="mf-bazi-dayun-steps">
          {chart.daYun.steps.map((step) => (
            <li key={step.ganzhi + step.startYear} className={step.current ? "is-current" : ""}>
              <b>{step.ganzhi}</b>
              <span>{step.startYear}–{step.endYear}</span>
              <small>{step.startAge}–{step.endAge} 岁</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="mf-bazi-sections" aria-labelledby="mf-bazi-sections-title">
        <div className="mf-identity-section-heading">
          <span>个人解读</span>
          <h2 id="mf-bazi-sections-title">八大板块解读</h2>
          <p>基于排盘数据的子平八字分析,仅供参考。</p>
        </div>
        <div className="mf-bazi-section-list">
          {result.sections.map((section, index) => (
            <article key={section.id}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><h3>{section.title}</h3></header>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mf-formula-global-basis">
        <div className="mf-bazi-verify">
          <span>排盘核对</span>
          <p>想自行核对排盘,可把同样的出生时间与地点放到问真八字验证(注意选择真太阳时选项):</p>
          <a className="mf-secondary-button" href={WENZHEN_URL} target="_blank" rel="noreferrer noopener">去问真八字核对排盘 →</a>
        </div>
        <p className="mf-report-generation-note">本解读基于子平八字体系,由排盘计算数据结合 AI 生成,仅供传统文化娱乐与自我观察参考,不构成医疗、财务或人生决策依据。</p>
      </section>
      <div className="mf-result-actions">{actions ?? <Link className="mf-secondary-button" href="/home/personal-reading">返回个人解读</Link>}</div>
    </div>
  );
}
