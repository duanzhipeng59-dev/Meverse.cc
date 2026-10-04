import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import ReportTopbar from "../../../../report-topbar";
import ReportToc from "../../../../report-toc";
import type { AreaLayer } from "../../../../myfate-bazi-profile";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";
import { buildStarBaziReport } from "../../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar, hasStarReportView, recordStarReportView } from "../../../../myfate-stars-server";
import { consumeReportCredit, getReportCredits } from "../../../../api/payments/epay/credits/server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

const ASK_SUGGESTIONS = [
  "TA 在感情中最需要什么？",
  "TA 为什么不容易表达脆弱？",
  "哪几年更容易出现重要关系？",
];

// 章节三层结构:结论 → 现实表现 → 优势/提醒 → 命理依据(默认折叠)
function Layers({ layer }: { layer: AreaLayer }) {
  return (
    <>
      <p className="mf-l3-conclusion">{layer.conclusion}</p>
      <ul className="mf-l3-behaviors">
        {layer.behaviors.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <div className="mf-l3-pair">
        <div className="is-good"><b>发挥得好</b><p>{layer.good}</p></div>
        <div className="is-watch"><b>需要留意</b><p>{layer.watch}</p></div>
      </div>
      <details className="mf-l3-basis">
        <summary>为什么这样解读</summary>
        <ul>{layer.basis.map((line) => <li key={line}>{line}</li>)}</ul>
      </details>
    </>
  );
}

function stageOf(score: number) {
  if (score >= 70) return { label: "顺势期", tone: "good" };
  if (score >= 50) return { label: "成长期", tone: "neutral" };
  if (score >= 40) return { label: "调整期", tone: "warn" };
  return { label: "谨慎期", tone: "caution" };
}

export default async function StarReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams;
  const user = await requirePageUser(`/home/relationship-test/${id}/test`);
  const star = await getPublishedStar(id);
  if (!star) notFound();

  const metered = await isUpgradesEnabled();
  if (metered && !(await hasStarReportView(user.id, id))) {
    if ((await getReportCredits(user.id)) <= 0) redirect("/home/upgrade");
    if ((await consumeReportCredit(user.id)) < 0) redirect("/home/upgrade");
  }
  void recordStarReportView(user.id, id, "bazi");
  const birth = await getCelebrityVedicBirth(id);
  const hasExactBirthTime = Boolean(birth?.birthTime);

  const chart = buildBaziChart({
    birthDate: birth?.birthDate ?? star.birthDate,
    birthTime: birth?.birthTime ?? "12:00",
    gender: birth?.gender === "female" ? "female" : "male",
    city: {
      id,
      name: birth?.birthPlace || "首尔",
      lat: birth?.lat ?? 37.57,
      lon: birth?.lon ?? 126.98,
      tz: birth?.tz ?? "Asia/Seoul",
    },
  });
  const report = buildStarBaziReport(chart);
  const profile = buildBaziLifeProfile(chart);
  const currentDayun = profile.dayun.find((step) => step.current) ?? profile.dayun[0];

  return (
    <div className="mf-zr mf-zr-paper">
      <ReportTopbar starId={id} fromReports={from === "reports"} />

      <header className="mf-zr-hero">
        <Image src={star.portraitSrc} alt={star.name} width={108} height={134} sizes="(max-width: 640px) 108px, 108px" unoptimized />
        <div className="mf-zr-hero-copy">
          <span className="mf-zr-kicker">AI BIRTH PORTRAIT · {star.role}</span>
          <h1>{star.name} 的 AI 生辰画像</h1>
          <p className="mf-paper-tagline">{profile.portrait.headline}</p>
          <div className="mf-paper-tags">{profile.portrait.keywords.map((k) => <span key={k}>{k}</span>)}</div>
          <small>出生 · {star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {hasExactBirthTime ? "已按出生时刻校准" : "时辰暂按正午估算,涉及时辰的结论可信度略降"}</small>
        </div>
      </header>

      {/* 快速认识 TA:摘要 + 五维 */}
      <section className="mf-zr-card" id="summary">
        <div className="mf-zr-section-head"><span>01</span><div><h2>快速认识 TA</h2><p>三十秒抓住核心,术语都翻译好了</p></div></div>
        <p className="mf-sum-headline">{profile.portrait.headline}</p>
        <div className="mf-sum-keywords" aria-label="性格关键词">
          {profile.portrait.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
        </div>
        <dl className="mf-sum-rows">
          <div><dt>核心优势</dt><dd>{profile.portrait.strength}</dd></div>
          <div><dt>隐藏矛盾</dt><dd>{profile.portrait.tension}</dd></div>
          <div><dt>人生课题</dt><dd>{profile.portrait.lesson}</dd></div>
        </dl>
        <h3 className="mf-zr-sub">五维速览</h3>
        <div className="mf-dims">
          {profile.dimensions.map((dim) => (
            <div className="mf-dim" key={dim.key}>
              <div className="mf-dim-head"><b>{dim.label}</b><em>{dim.level}</em></div>
              <p>{dim.explain}</p>
              <details className="mf-l3-basis"><summary>命理依据</summary><p>{dim.basis}</p></details>
            </div>
          ))}
        </div>
      </section>

      <ReportToc items={[
        { id: "summary", label: "总览" },
        { id: "who", label: "性格" },
        { id: "love", label: "感情" },
        { id: "career", label: "事业" },
        { id: "wellbeing", label: "身心" },
        { id: "stages", label: "人生阶段" },
        { id: "future", label: "未来十年" },
        { id: "ask", label: "AI 追问" },
      ]} />

      <section className="mf-zr-card" id="who">
        <div className="mf-zr-section-head"><span>02</span><div><h2>TA 是什么样的人</h2><p>性格与天赋 · {profile.summary.pattern}</p></div></div>
        <h3 className="mf-zr-sub">性格底色</h3>
        <Layers layer={profile.areas.personality} />
        <h3 className="mf-zr-sub">天赋组合</h3>
        <Layers layer={profile.areas.talent} />
      </section>

      <section className="mf-zr-card" id="love">
        <div className="mf-zr-section-head"><span>03</span><div><h2>TA 如何表达感情</h2><p>感情模式 · 夫妻宫/配偶星</p></div></div>
        <Layers layer={profile.areas.relationship} />
        <h3 className="mf-zr-sub">TA 容易被谁吸引</h3>
        <Layers layer={profile.areas.family} />
      </section>

      <section className="mf-zr-card" id="match">
        <div className="mf-zr-section-head"><span>04</span><div><h2>TA 适合怎样的关系</h2><p>正缘画像 · 来自婚恋位推导</p></div></div>
        <p className="mf-l3-conclusion">TA 的另一半,大概率长这样(以下是命盘推导的倾向,不是预言)。</p>
        <dl className="mf-zr-kv">
          {report.love.spouseTraits.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}
        </dl>
        <div className="mf-l3-pair">
          <div className="is-good"><b>关系怎么变好</b><p>{report.love.family.replace("对方家庭 ", "")}</p></div>
          <div className="is-watch"><b>要留意的信号</b><p>{report.love.stability.replace("婚姻稳定性 ", "")}</p></div>
        </div>
        <details className="mf-l3-basis">
          <summary>为什么这样解读</summary>
          <ul>
            <li>配偶星(代表伴侣的能量)五行:{profile.summary.favorable.includes(report.love.spouseTraits[0]?.text.includes("木") ? "木" : "水") ? "与喜用同气" : "独立判断"}</li>
            <li>夫妻宫(日支)坐 {chart.pillars[2].ganzhi[1]},藏干 {chart.pillars[2].hideGan.join("、")}</li>
            {!hasExactBirthTime ? <li>可信度提示:出生时辰为估算,涉及时柱的结论应视为趋势参考</li> : <li>出生时辰已确认,夫妻宫与时柱相关结论可信度较高</li>}
          </ul>
        </details>
      </section>

      <section className="mf-zr-card" id="career">
        <div className="mf-zr-section-head"><span>05</span><div><h2>TA 的事业与财富</h2><p>适合干什么、钱从哪来</p></div></div>
        <h3 className="mf-zr-sub">事业方向</h3>
        <Layers layer={profile.areas.career} />
        <h3 className="mf-zr-sub">财富模式</h3>
        <Layers layer={profile.areas.wealth} />
      </section>

      <section className="mf-zr-card" id="wellbeing">
        <div className="mf-zr-section-head"><span>06</span><div><h2>身心与回血方式</h2><p>内在矛盾、消耗点与休息方法</p></div></div>
        <Layers layer={profile.areas.wellbeing} />
        <h3 className="mf-zr-sub">四句话总结</h3>
        <ol className="mf-zr-advice">{profile.advice.map((item) => <li key={item}>{item}</li>)}</ol>
        <details className="mf-l3-basis">
          <summary>TA 的命局作用关系与神煞</summary>
          <div className="mf-zr-relation-grid">
            {profile.relations.map((relation, index) => <article className={`is-${relation.tone === "good" ? "good" : relation.tone === "caution" ? "caution" : ""}`} key={relation.title + index}><b>{relation.title}</b><p>{relation.text}</p></article>)}
          </div>
          <div className="mf-zr-relation-grid">
            {report.portrait.shenSha.map((item) => <article key={item.label}><b>{item.label}</b><p>{item.text.replace(`${item.label}：`, "")}</p></article>)}
          </div>
        </details>
      </section>

      <section className="mf-zr-card" id="future">
        <div className="mf-zr-section-head"><span>07</span><div><h2>未来几年怎么看</h2><p>先看十年走势,再看每一年</p></div></div>
        <p className="mf-l3-conclusion">TA 当前处在「{currentDayun.ganzhi}大运」({currentDayun.yearText}):{currentDayun.theme}</p>

        <h3 className="mf-zr-sub">十年走势总览</h3>
        <div className="mf-decade" role="tablist" aria-label="十年走势">
          {profile.annual.map((year) => {
            const stage = stageOf(year.score);
            return (
              <a className={`is-${stage.tone}`} href={`#y${year.year}`} key={year.year}>
                <b>{year.year}</b><span>{year.keyword}</span><em>{stage.label}</em>
              </a>
            );
          })}
        </div>
        <p className="mf-decade-legend">状态由命盘结构信号计算(流年干支与原局、当前大运的合冲关系):<i className="is-good">顺势期</i>阻力小 <i className="is-neutral">成长期</i>稳步推进 <i className="is-warn">调整期</i>变化多 <i className="is-caution">谨慎期</i>保守为宜。点击年份看详细解读。</p>

        <h3 className="mf-zr-sub">逐年解读</h3>
        <div className="mf-year2-list">
          {profile.annual.map((year) => {
            const stage = stageOf(year.score);
            return (
              <article className={`mf-year2 is-${stage.tone}`} id={`y${year.year}`} key={year.year}>
                <div className="mf-year2-head">
                  <b>{year.year}</b>
                  <span>{year.keyword}{year.continuation ? " · 延续上年" : ""}</span>
                  <em>{stage.label}<i>{year.score}</i></em>
                </div>
                <p className="mf-year2-theme">{year.theme}</p>
                <details className="mf-l3-basis">
                  <summary>展开解读</summary>
                  <div className="mf-year2-detail">
                    <p><b>有机会的领域</b>{year.opportunity}</p>
                    <p><b>需要留意</b>{year.watch}</p>
                    <p><b>建议动作</b>{year.advice}</p>
                    <p><b>大运背景</b>{year.dayunGanzhi}大运({year.dayunRange})期间,这一年的节奏叠加在十年背景之上。</p>
                    <ul>{year.basis.map((line) => <li key={line}>{line}</li>)}</ul>
                  </div>
                </details>
              </article>
            );
          })}
        </div>

        <h3 className="mf-zr-sub">感情流年</h3>
        <div className="mf-year2-list">
          {report.love.romanceYears.map((item) => {
            const positiveLabels = ["缘分增强", "关系升温", "适合推进"];
            const steadyLabels = ["平稳发展", "自然相处", "持续观察"];
            const cautionLabels = ["放慢节奏", "注意沟通", "谨慎推进"];
            const stage = item.warn ? cautionLabels[item.year % 3] : item.probability >= 45 ? positiveLabels[item.year % 3] : steadyLabels[item.year % 3];
            return (
              <article className={`mf-year2 ${item.warn ? "is-caution" : item.probability >= 45 ? "is-good" : ""}`} key={item.year}>
                <div className="mf-year2-head">
                  <b>{item.year}</b>
                  <span>{item.ganzhi}年 · {stage}</span>
                  <em>{item.warn ? "调整期" : item.probability >= 45 ? "顺势期" : "成长期"}<i>{item.probability}%</i></em>
                </div>
                <p className="mf-year2-theme">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mf-zr-card" id="stages">
        <div className="mf-zr-section-head"><span>08</span><div><h2>人生阶段与命盘</h2><p>排盘数据与十年阶段,供深入核对</p></div></div>
        <div className="mf-chart-brief">
          <div><small>性格底色(日主)</small><b>{report.dayMaster}{profile.summary.dayElement} · {profile.summary.yinYang}</b></div>
          <div><small>出生季节(月令)</small><b>{profile.summary.season}</b></div>
          <div><small>人生主剧本(格局)</small><b>{profile.summary.pattern}</b></div>
        </div>

        <h3 className="mf-zr-sub">四柱排盘</h3>
        <div className="mf-zr-chart-grid">
          {report.pillars.map((pillar) => (
            <div className={`mf-zr-pillar-col ${pillar.label === "日柱" ? "is-day" : ""}`} key={pillar.label}>
              <small>{pillar.label}</small>
              <em>{pillar.shiShenGan}</em>
              <div className="mf-zr-ganzhi"><b>{pillar.ganzhi[0]}</b><b>{pillar.ganzhi[1]}</b></div>
              <small>{pillar.hideGan.map((gan, index) => `${gan}·${pillar.hideShiShen[index] ?? ""}`).join(" / ")}</small>
              <small>{pillar.naYin} · {pillar.diShi}</small>
              <small>旬空 {pillar.xunKong}</small>
            </div>
          ))}
        </div>
        <div className="mf-zr-foundation">
          <div><small>能量状态(旺衰)</small><b>{profile.summary.strength}</b></div>
          <div><small>喜用五行</small><b>{profile.summary.favorable.join("、")}</b></div>
          <div><small>需节制五行</small><b>{profile.summary.cautious.join("、")}</b></div>
        </div>

        <h3 className="mf-zr-sub">五行分布</h3>
        <div className="mf-zr-wuxing">
          {(() => {
            const max = Math.max(1, ...Object.values(report.wuXing));
            const plain: Record<string, string> = { 木: "爱规划、肯慢慢长", 火: "有热度、说干就干", 土: "稳得住、能扛事", 金: "有主见、干脆利落", 水: "脑子活、会看形势" };
            return Object.entries(report.wuXing).map(([element, count]) => (
              <div className="mf-zr-wx" data-el={element} key={element}>
                <span>{element}</span><div className="mf-zr-wx-bar"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></div><small>{count}</small>
                <p className="mf-wx-plain">{plain[element]}</p>
              </div>
            ));
          })()}
        </div>

        <h3 className="mf-zr-sub">十神力量分组</h3>
        <div className="mf-god-groups">
          {(() => {
            const lead = profile.tenGods.filter((g) => g.level === "主导");
            const mid = profile.tenGods.filter((g) => g.level === "明显");
            const rest = profile.tenGods.filter((g) => g.level !== "主导" && g.level !== "明显");
            const groups = [
              { title: "主导力量", gods: lead, note: "推着 TA 走的引擎" },
              { title: "辅助力量", gods: mid.length ? mid : profile.tenGods.slice(1, 3), note: "幕后起作用的调节器" },
              { title: "偏弱力量", gods: rest, note: "存在感弱,但并非缺点" },
            ].filter((group) => group.gods.length);
            return groups.map((group) => (
              <div className="mf-god-group" key={group.title}>
                <b>{group.title}<small>{group.note}</small></b>
                {group.gods.map((god) => (
                  <div key={god.name}>
                    <span>{god.name}</span>
                    <p>{god.reading}</p>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>

        <h3 className="mf-zr-sub">一生大运</h3>
        <div className="mf-dayun-timeline">
          {profile.dayun.map((step) => (
            <details className={`mf-dayun-item ${step.current ? "is-current" : ""}`} key={step.ganzhi + step.yearText} open={step.current}>
              <summary>
                <b>{step.ganzhi}</b>
                <span>{step.ageText} · {step.yearText}</span>
                {step.current ? <em>当前</em> : null}
              </summary>
              <p>{step.theme}</p>
            </details>
          ))}
        </div>

        <details className="mf-l3-basis mf-chart-full">
          <summary>查看更多专业数据(神煞/作用关系/精确时辰)</summary>
          <div className="mf-zr-relation-grid">
            {profile.relations.map((relation, index) => <article key={relation.title + index}><b>{relation.title}</b><p>{relation.text}</p></article>)}
          </div>
          <div className="mf-zr-relation-grid">
            {report.portrait.shenSha.map((item) => <article key={item.label}><b>{item.label}</b><p>{item.text.replace(`${item.label}：`, "")}</p></article>)}
          </div>
          <p className="mf-zr-chart-note">真太阳时 {chart.trueSolar.adjustedTime}({chart.trueSolar.city},共校正 {chart.trueSolar.totalCorrectionMin} 分钟)· 起运 {chart.daYun.startText}</p>
        </details>
      </section>

      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} /></div>

      <p className="mf-zr-note">本报告基于四柱、十神、五行与大运流年做文化解读,仅供自我观察与娱乐参考,不替代医疗、法律或投资建议。</p>
    </div>
  );
}
