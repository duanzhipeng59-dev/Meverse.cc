import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";
import { buildStarBaziReport } from "../../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar, hasStarReportView, recordStarReportView } from "../../../../myfate-stars-server";
import { consumeReportCredit, getReportCredits } from "../../../../api/payments/epay/credits/server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

const ASK_SUGGESTIONS = [
  "TA 的感情模式与正缘特征是什么？",
  "我想和TA合盘",
  "未来三年最重要的运势变化是什么？",
];

function ReadingBlock({ title, summary, details }: { title: string; summary: string; details: string[] }) {
  return (
    <article className="mf-zr-reading">
      <h3>{title}</h3>
      <p className="mf-zr-reading-lead">{summary}</p>
      <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
    </article>
  );
}

export default async function StarReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/home/relationship-test/${id}/test`);
  const star = await getPublishedStar(id);
  if (!star) notFound();

  const metered = await isUpgradesEnabled();
  if (metered && !(await hasStarReportView(user.id, id))) {
    if ((await getReportCredits(user.id)) <= 0) redirect("/home/upgrade");
    if ((await consumeReportCredit(user.id)) < 0) redirect("/home/upgrade");
  }
  void recordStarReportView(user.id, id);
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

  return (
    <div className="mf-zr">
      <div className="mf-zr-topbar">
        <Link className="mf-back-link" href="/home/relationship-test">← 返回明星解读</Link>
        <span>AI 生辰画像</span>
      </div>

      <header className="mf-zr-hero">
        <Image src={star.portraitSrc} alt={star.name} width={108} height={134} sizes="(max-width: 640px) 108px, 108px" unoptimized />
        <div className="mf-zr-hero-copy">
          <span className="mf-zr-kicker">AI BIRTH PORTRAIT · {star.role}</span>
          <h1>{star.name} 的 AI 生辰画像</h1>
          <p>{profile.summary.statement}</p>
          <small>出生 · {star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {hasExactBirthTime ? "已按出生时刻校准" : "时辰暂按正午估算"}</small>
          <div className="mf-zr-pillars">
            {report.pillars.map((pillar) => (
              <span className="mf-zr-pillar" key={pillar.label}>
                <small>{pillar.label.replace("柱", "")}</small>
                <b>{pillar.ganzhi}</b>
              </span>
            ))}
          </div>
        </div>
      </header>

      <nav className="mf-zr-toc" aria-label="报告目录">
        <a href="#chart">命盘</a><a href="#portrait">画像</a><a href="#ten-gods">十神</a><a href="#career">事业财富</a><a href="#relationship">关系家庭</a><a href="#wellbeing">身心</a><a href="#luck">大运流年</a><a href="#ask">AI 追问</a>
      </nav>

      <section className="mf-zr-card" id="chart">
        <div className="mf-zr-section-head"><span>01</span><div><h2>命局底盘</h2><p>四柱、藏干、十神、纳音与能量阶段</p></div></div>
        <div className="mf-zr-chart-grid">
          {report.pillars.map((pillar) => (
            <div className={`mf-zr-pillar-col ${pillar.label === "日柱" ? "is-day" : ""}`} key={pillar.label}>
              <small>{pillar.label}</small>
              <em>{pillar.shiShenGan}</em>
              <div className="mf-zr-ganzhi"><b>{pillar.ganzhi[0]}</b><b>{pillar.ganzhi[1]}</b></div>
              <small>{pillar.hideGan.map((gan, index) => `${gan} · ${pillar.hideShiShen[index] ?? ""}`).join(" / ")}</small>
              <small>{pillar.naYin} · {pillar.diShi}</small>
              <small>旬空 {pillar.xunKong}</small>
            </div>
          ))}
        </div>

        <div className="mf-zr-foundation">
          <div><small>日主</small><b>{report.dayMaster}{profile.summary.dayElement} · {profile.summary.yinYang}</b></div>
          <div><small>月令</small><b>{profile.summary.season}</b></div>
          <div><small>旺衰</small><b>{profile.summary.strength}</b></div>
          <div><small>主导结构</small><b>{profile.summary.pattern}</b></div>
        </div>

        <div className="mf-zr-wuxing">
          {(() => {
            const max = Math.max(1, ...Object.values(report.wuXing));
            return Object.entries(report.wuXing).map(([element, count]) => (
              <div className="mf-zr-wx" data-el={element} key={element}>
                <span>{element}</span><div className="mf-zr-wx-bar"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></div><small>{count}</small>
              </div>
            ));
          })()}
        </div>

        <div className="mf-zr-aux">
          <div><small>胎元</small><b>{chart.auxiliary.taiYuan}</b><span>{chart.auxiliary.taiYuanNaYin}</span></div>
          <div><small>胎息</small><b>{chart.auxiliary.taiXi}</b><span>{chart.auxiliary.taiXiNaYin}</span></div>
          <div><small>命宫</small><b>{chart.auxiliary.mingGong}</b><span>{chart.auxiliary.mingGongNaYin}</span></div>
          <div><small>身宫</small><b>{chart.auxiliary.shenGong}</b><span>{chart.auxiliary.shenGongNaYin}</span></div>
        </div>
        <p className="mf-zr-chart-note">真太阳时 {chart.trueSolar.adjustedTime}（{chart.trueSolar.city}，共校正 {chart.trueSolar.totalCorrectionMin} 分钟）· 起运 {chart.daYun.startText}</p>
      </section>

      <section className="mf-zr-card" id="portrait">
        <div className="mf-zr-section-head"><span>02</span><div><h2>核心生辰画像</h2><p>性格底色、行为模式与优势天赋</p></div></div>
        <div className="mf-zr-verdict">
          <p>{profile.summary.statement}</p>
          <div><span>喜用：{profile.summary.favorable.join("、")}</span><span>慎用：{profile.summary.cautious.join("、")}</span></div>
        </div>
        <div className="mf-zr-reading-grid">
          <ReadingBlock title="性格内核" {...profile.areas.personality} />
          <ReadingBlock title="天赋与潜能" {...profile.areas.talent} />
        </div>
        <h3 className="mf-zr-sub">四柱人生层次</h3>
        <div className="mf-zr-stage-grid">
          {profile.lifeStages.map((stage) => <article key={stage.label}><span>{stage.label} · {stage.scope}</span><b>{stage.ganzhi} · {stage.diShi}</b><p>{stage.text}</p></article>)}
        </div>
      </section>

      <section className="mf-zr-card" id="ten-gods">
        <div className="mf-zr-section-head"><span>03</span><div><h2>十神能量结构</h2><p>看清驱动力、表达方式、资源观和责任模式</p></div></div>
        <div className="mf-zr-god-grid">
          {profile.tenGods.map((god) => (
            <article key={god.name} className={god.level === "主导" ? "is-primary" : ""}>
              <div><b>{god.name}</b><span>{god.level} · {god.value.toFixed(1)}</span></div>
              <small>{god.keywords.join(" · ")}</small><p>{god.reading}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mf-zr-card" id="career">
        <div className="mf-zr-section-head"><span>04</span><div><h2>事业与财富</h2><p>适合的成就路径、资源模式与风险边界</p></div></div>
        <div className="mf-zr-reading-grid">
          <ReadingBlock title="事业路径" {...profile.areas.career} />
          <ReadingBlock title="财富模式" {...profile.areas.wealth} />
        </div>
      </section>

      <section className="mf-zr-card" id="relationship">
        <div className="mf-zr-section-head"><span>05</span><div><h2>关系与家庭</h2><p>亲密关系模式、配偶星、夫妻宫与原生环境</p></div></div>
        <div className="mf-zr-reading-grid">
          <ReadingBlock title="亲密关系" {...profile.areas.relationship} />
          <ReadingBlock title="家庭影响" {...profile.areas.family} />
        </div>
        <h3 className="mf-zr-sub">正缘与伴侣画像</h3>
        <dl className="mf-zr-kv">
          {report.love.spouseTraits.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}
        </dl>
        <p className="mf-zr-p">{report.love.family}</p><p className="mf-zr-p">{report.love.stability}</p>
      </section>

      <section className="mf-zr-card" id="wellbeing">
        <div className="mf-zr-section-head"><span>06</span><div><h2>身心能量与调节</h2><p>从五行偏向理解恢复方式，不作医学诊断</p></div></div>
        <ReadingBlock title="身心节律" {...profile.areas.wellbeing} />
        <h3 className="mf-zr-sub">命局作用关系</h3>
        <div className="mf-zr-relation-grid">
          {profile.relations.map((relation, index) => <article className={`is-${relation.tone}`} key={relation.title + index}><b>{relation.title}</b><p>{relation.text}</p></article>)}
        </div>
        <h3 className="mf-zr-sub">辅助神煞</h3>
        <div className="mf-zr-relation-grid">
          {report.portrait.shenSha.map((item) => <article key={item.label}><b>{item.label}</b><p>{item.text.replace(`${item.label}：`, "")}</p></article>)}
        </div>
      </section>

      <section className="mf-zr-card" id="luck">
        <div className="mf-zr-section-head"><span>07</span><div><h2>大运与未来十年</h2><p>先看十年背景，再看每一年的行动节奏</p></div></div>
        <div className="mf-zr-dayun-detail">
          {profile.dayun.map((step) => (
            <article className={`is-${step.tone} ${step.current ? "is-current" : ""}`} key={step.ganzhi + step.yearText}>
              <div><b>{step.ganzhi}</b><span>{step.ageText}</span>{step.current ? <em>当前大运</em> : null}</div><small>{step.yearText}</small><p>{step.theme}</p>
            </article>
          ))}
        </div>
        <h3 className="mf-zr-sub">未来十年流年提示</h3>
        <div className="mf-zr-year-grid">
          {profile.annual.map((year) => (
            <article className={`is-${year.tone}`} key={year.year}>
              <div><b>{year.year}</b><span>{year.ganzhi} · {year.focus}</span><em>{year.score}</em></div><p>{year.text}</p>
            </article>
          ))}
        </div>
        <h3 className="mf-zr-sub">感情流年</h3>
        <div className="mf-zr-year-grid">
          {report.love.romanceYears.map((item, index) => {
            const positiveLabels = ["缘分增强", "关系升温", "适合推进"];
            const steadyLabels = ["平稳发展", "自然相处", "持续观察"];
            const cautionLabels = ["放慢节奏", "注意沟通", "谨慎推进"];
            const status = item.warn
              ? cautionLabels[index % cautionLabels.length]
              : item.probability >= 45
                ? positiveLabels[index % positiveLabels.length]
                : steadyLabels[index % steadyLabels.length];
            return (
              <article className={item.warn ? "is-caution" : item.probability >= 45 ? "is-good" : ""} key={item.year}>
                <div><b>{item.year}</b><span>{item.ganzhi}年 · {status}</span><em>{item.probability}%</em></div>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mf-zr-card">
        <div className="mf-zr-section-head"><span>08</span><div><h2>画像总结与行动建议</h2><p>把命局倾向转化成可以执行的选择</p></div></div>
        <ol className="mf-zr-advice">{profile.advice.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} /></div>

      <p className="mf-zr-note">本报告基于四柱、藏干、十神、五行、十二长生、命宫身宫、大运与流年进行文化解读，仅供自我观察与娱乐参考，不替代医疗、法律或投资建议。</p>
    </div>
  );
}
