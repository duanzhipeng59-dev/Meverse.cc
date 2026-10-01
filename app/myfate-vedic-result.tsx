import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import {
  vedicSignZh,
  vedicPlanetZh,
  vedicNakshatraZh,
  type VedicCompositeResult,
  type VedicDimension,
} from "./myfate-vedic-types";

function zh<T extends Record<string, string>>(table: T, value: string) {
  return table[value] ?? value;
}

const confidenceLabel: Record<VedicDimension["confidence"], string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信",
};

const tierTone = (tier: string) => {
  if (/支持|顺畅|有资源|互补|同步|温和|强烈|高承载/u.test(tier)) return "is-supportive";
  if (/高压|易升级|承载不足|责任失衡|错位|不宜|黏着|不对称|竞争/u.test(tier)) return "is-strained";
  return "is-mixed";
};

function ChartCard({ title, chart, showLagna }: { title: string; chart: VedicCompositeResult["userChart"]; showLagna: boolean }) {
  return (
    <article className="mf-vedic-chart-card">
      <span>{title}</span>
      {showLagna ? <h3>{zh(vedicSignZh, chart.lagna)} 上升</h3> : <h3 className="is-muted">时辰未公开 · 不排上升</h3>}
      <dl>
        <div><dt>月亮</dt><dd>{zh(vedicSignZh, chart.moonSign)} · {zh(vedicNakshatraZh, chart.moonNakshatra)} p{chart.moonPada}</dd></div>
        <div><dt>太阳</dt><dd>{zh(vedicSignZh, chart.sunSign)}</dd></div>
        <div><dt>金星</dt><dd>{zh(vedicSignZh, chart.venusSign)}</dd></div>
        <div><dt>火星</dt><dd>{zh(vedicSignZh, chart.marsSign)}</dd></div>
      </dl>
    </article>
  );
}

function OverlayTable({ title, items }: { title: string; items: VedicCompositeResult["overlayHighlights"]["userToStar"] }) {
  if (!items.length) return null;
  return (
    <div className="mf-vedic-overlay">
      <h4>{title}</h4>
      <table>
        <thead><tr><th>行星</th><th>星座</th><th>落入宫位</th><th>状态</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.planet}-${item.house_in_dst}`}>
              <td>{zh(vedicPlanetZh, item.planet)}</td>
              <td>{zh(vedicSignZh, item.sign)}</td>
              <td>第{item.house_in_dst}宫</td>
              <td>{item.dignity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VedicCompositeResultView({
  star,
  result,
  actions,
}: {
  star: Pick<StarProfile, "id" | "name" | "portraitSrc">;
  result: VedicCompositeResult;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mf-formula-result mf-vedic-result">
      <section className="mf-formula-verdict is-relationship-identity">
        <span>MYFATE · 吠陀合盘分析</span>
        <div className="mf-formula-verdict-person"><i style={{ backgroundImage: `url("${star.portraitSrc}")` }} /><small>你与 {star.name}</small></div>
        <p className="mf-identity-lead">关系类型结论</p>
        <h1>{result.relationshipType}</h1>
        <p className="mf-vedic-headline">{result.headline}</p>
        <p className="mf-vedic-insight">{result.insight}</p>
        <div className="mf-formula-facts">
          <div><strong>吠陀占星</strong><small>Jyotish · Parashara</small></div>
          <div><strong>True Citra</strong><small>恒星黄道 · Mean Node</small></div>
          <div><strong>六维矩阵</strong><small>不做单一打分</small></div>
        </div>
      </section>

      <section className="mf-vedic-dimensions" aria-labelledby="mf-vedic-dimensions-title">
        <div className="mf-identity-section-heading">
          <span>六维关系矩阵</span>
          <h2 id="mf-vedic-dimensions-title">六个维度的档位与证据</h2>
          <p>每个维度只给档位判断，附支持与制约证据、置信度和现实验证点，不做总分排名。</p>
        </div>
        <div className="mf-vedic-dimension-list">
          {result.dimensions.map((dimension) => (
            <article className={`mf-vedic-dimension ${tierTone(dimension.tier)}`} key={dimension.label}>
              <header>
                <h3>{dimension.label}</h3>
                <span className="mf-vedic-tier">{dimension.tier}</span>
                <span className="mf-vedic-confidence">{confidenceLabel[dimension.confidence]}</span>
              </header>
              <div className="mf-vedic-evidence">
                <p className="is-supporting"><small>支持证据</small>{dimension.supportingEvidence}</p>
                <p className="is-limiting"><small>制约证据</small>{dimension.limitingEvidence}</p>
              </div>
              <p className="mf-vedic-direction"><small>方向差异</small>{dimension.directionGap}</p>
              <footer><small>现实验证点</small>{dimension.realityCheck}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="mf-vedic-interaction" aria-labelledby="mf-vedic-interaction-title">
        <div className="mf-identity-section-heading">
          <span>TA 在你生命里的位置</span>
          <h2 id="mf-vedic-interaction-title">TA 的行星落入你的宫位</h2>
          <p>你的宫位由真实出生时间确定，TA 的行星星座由天文历表确定——这一层证据可靠。</p>
        </div>
        <OverlayTable title={`${star.name} 的行星 → 你的宫位`} items={result.overlayHighlights.starToUser} />
      </section>

      <section className="mf-vedic-charts" aria-labelledby="mf-vedic-charts-title">
        <div className="mf-identity-section-heading">
          <span>星盘对照</span>
          <h2 id="mf-vedic-charts-title">双方星盘摘要</h2>
          <p>上升（Lagna）与月亮（Moon）是吠陀合盘的两个基准点。</p>
        </div>
        <div className="mf-vedic-chart-grid">
          <ChartCard title="你的星盘" chart={result.userChart} showLagna />
          <ChartCard title={`${star.name} 的星盘`} chart={result.starChart} showLagna={false} />
        </div>
      </section>

      {result.ashtakoota.length ? (
        <section className="mf-vedic-koota" aria-labelledby="mf-vedic-koota-title">
          <div className="mf-identity-section-heading">
            <span>月宿筛查</span>
            <h2 id="mf-vedic-koota-title">Ashtakoota 八项</h2>
            <p>传统月宿配对筛查层，仅作参考，不构成一票否决。</p>
          </div>
          <table>
            <thead><tr><th>Koota</th><th>档位</th><th>现代维度</th></tr></thead>
            <tbody>
              {result.ashtakoota.map((item) => (
                <tr key={item.item}><td>{item.item}</td><td>{item.tier}</td><td>{item.dim}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mf-formula-global-basis">
        <p className="mf-formula-basis-summary">{result.tension}</p>
        {result.timingNotes.length ? (
          <div className="mf-vedic-timing">
            <span>时机观察（仅你的行运）</span>
            <ul>{result.timingNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
          </div>
        ) : null}
        <p className="mf-report-generation-note">本分析基于吠陀占星（Swiss Ephemeris / PyJHora，True Chitrapaksha Ayanamsa），由跨盘计算数据生成，仅供文化娱乐与关系观察参考，不构成现实关系预测。</p>
      </section>
      <div className="mf-result-actions">{actions ?? <Link className="mf-secondary-button" href="/home/reports">返回我的收藏</Link>}</div>
    </div>
  );
}
