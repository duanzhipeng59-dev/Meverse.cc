import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildStarBaziHeadline, buildStarBaziReport } from "../../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar, hasStarReportView, recordStarReportView } from "../../../../myfate-stars-server";
import { consumeReportCredit, getReportCredits } from "../../../../api/payments/epay/credits/server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

const ASK_SUGGESTIONS = [
  "他的正缘大概什么时候出现？",
  "什么属相和他最般配？",
  "他的正缘外貌和性格特征是什么？",
];

function LeadText({ text }: { text: string }) {
  const cut = text.indexOf(" ");
  const head = cut > 0 ? text.slice(0, cut) : "";
  const body = cut > 0 ? text.slice(cut + 1) : text;
  return <>{head ? <b>{head}</b> : null}{body}</>;
}

export default async function StarReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/home/relationship-test/${id}/test`);
  const star = await getPublishedStar(id);
  if (!star) notFound();

  // 付费模式:首次解锁一位偶像的报告消耗 1 次解读,已解锁的重看免费;免费模式直接放行
  const metered = await isUpgradesEnabled();
  if (metered && !(await hasStarReportView(user.id, id))) {
    if ((await getReportCredits(user.id)) <= 0) redirect("/home/upgrade");
    if ((await consumeReportCredit(user.id)) < 0) redirect("/home/upgrade");
  }
  void recordStarReportView(user.id, id);
  const birth = await getCelebrityVedicBirth(id);

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
  const headline = buildStarBaziHeadline(chart);

  return (
    <div className="mf-zr">
      <div className="mf-zr-topbar">
        <Link className="mf-back-link" href="/home/relationship-test">← 返回明星解读</Link>
        <span>正缘分析报告</span>
      </div>

      <header className="mf-zr-hero">
        <img src={star.portraitSrc} alt="" />
        <div>
          <span className="mf-zr-kicker">{star.role}</span>
          <h1>{star.name} 的正缘分析</h1>
          <p>{headline || `“${star.tagline}”`}</p>
          <small>BORN · {star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {star.matchCount} 浏览</small>
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

      <section className="mf-zr-card">
        <h2 className="mf-zr-card-title">✦ 四柱排盘</h2>
        <div className="mf-zr-chart-grid">
          {report.pillars.map((pillar) => (
            <div className={`mf-zr-pillar-col ${pillar.label === "日柱" ? "is-day" : ""}`} key={pillar.label}>
              <small>{pillar.label}</small>
              <em>{pillar.shiShenGan}</em>
              <div className="mf-zr-ganzhi"><b>{pillar.ganzhi[0]}</b><b>{pillar.ganzhi[1]}</b></div>
              <small>{pillar.hideGan.map((gan, i) => `${gan}${pillar.hideShiShen[i] ?? ""}`).join(" · ")}</small>
              <small>{pillar.naYin}</small>
            </div>
          ))}
        </div>
        <div className="mf-zr-wuxing">
          {(() => {
            const max = Math.max(1, ...Object.values(report.wuXing));
            return Object.entries(report.wuXing).map(([element, count]) => (
              <div className="mf-zr-wx" data-el={element} key={element}>
                <span>{element}</span>
                <div className="mf-zr-wx-bar"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
                <small>{count}</small>
              </div>
            ));
          })()}
        </div>
        <p className="mf-zr-chart-note">起运 {chart.daYun.startText} · 当前 {chart.currentDaYunGanZhi || "—"} 大运 · {chart.currentYearGanZhi}年</p>
      </section>

      <section className="mf-zr-card">
        <h2 className="mf-zr-card-title">✦ 人生画像</h2>
        <p className="mf-zr-lead"><b>{report.portrait.strength}。</b>{report.portrait.lead.replace(/^([^。]+。)/, "")}</p>
        <p className="mf-zr-p"><LeadText text={report.portrait.daoFa} /></p>
        <div className="mf-zr-xi">
          <p>{report.portrait.xi}</p>
          <p>{report.portrait.ji}</p>
          <p>{report.portrait.xian}</p>
        </div>
        <blockquote className="mf-zr-quote">
          <b>「{report.portrait.shenShaTitle}」</b>
          {report.portrait.shenSha.map((item) => (
            <p key={item.label}><b>{item.label}</b>{item.text.replace(`${item.label}：`, "：")}</p>
          ))}
        </blockquote>
        <p className="mf-zr-p"><LeadText text={report.portrait.personality} /></p>
      </section>

      <section className="mf-zr-card">
        <h2 className="mf-zr-card-title">✦ 大运走势</h2>
        <div className="mf-zr-dayun">
          {report.daYun.steps.map((step) => (
            <div className={`mf-zr-dy ${step.current ? "is-current" : ""}`} key={`${step.ganzhi}-${step.startYear}`}>
              <small>{step.startAge}-{step.endAge}岁</small>
              <b>{step.ganzhi}</b>
              <small>{step.startYear}-{step.endYear}</small>
              {step.current ? <span className="mf-zr-dy-now">当前</span> : null}
            </div>
          ))}
        </div>
        <p className="mf-zr-chart-note">大运每十年一换，当前大运会染上它干支五行的色彩；流年概率与婚恋窗口均以此为背景。</p>
      </section>

      <section className="mf-zr-card">
        <h2 className="mf-zr-card-title">♡ 感情</h2>
        <dl className="mf-zr-kv">
          {report.love.spouseTraits.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mf-zr-p"><LeadText text={report.love.family} /></p>
        <p className="mf-zr-p"><LeadText text={report.love.stability} /></p>

        <h3 className="mf-zr-sub">近期感情流年</h3>
        <ul className="mf-zr-list">
          {report.love.romanceYears.map((item) => (
            <li key={item.year}>
              <b>{item.year}（{item.ganzhi}）· 缘分概率 {item.probability}%</b>
              {item.warn ? <span className="mf-zr-warn"> ⚠️</span> : null}
              <br />{item.text}
            </li>
          ))}
        </ul>
      </section>

      <StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} />

      <p className="mf-zr-note">
        分析基于八字（四柱、十神、大运），仅供文化娱乐
      </p>
    </div>
  );
}
