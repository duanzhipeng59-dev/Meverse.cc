import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import ReportTopbar from "../../../../report-topbar";
import ReportToc from "../../../../report-toc";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";
import { buildStarBaziReport } from "../../../../myfate-star-bazi-report";
import { buildConsultReport } from "../../../../myfate-portrait-consult";
import { getCelebrityVedicBirth, getPublishedStar, hasStarReportView, recordStarReportView } from "../../../../myfate-stars-server";
import { consumeReportCredit, getReportCredits } from "../../../../api/payments/epay/credits/server";
import { isUpgradesEnabled } from "../../../../myfate-settings";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

const ASK_SUGGESTIONS = [
  "TA 的道法在事业上怎么落地？",
  "TA 哪几年最容易有财富突破？",
  "和 TA 相处最需要注意什么？",
];

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
  const consult = buildConsultReport(chart, profile, report);

  return (
    <div className="mf-zr">
      <ReportTopbar starId={id} fromReports={from === "reports"} />

      <header className="mf-zr-hero">
        <Image src={star.portraitSrc} alt={star.name} width={108} height={134} sizes="108px" unoptimized />
        <div className="mf-zr-hero-copy">
          <span className="mf-zr-kicker">AI BIRTH PORTRAIT · {star.role}</span>
          <h1>{star.name} 的 AI 生辰画像</h1>
          <p>{profile.summary.statement}</p>
          <small>出生 · {star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {hasExactBirthTime ? "已按出生时刻校准" : "时辰暂按正午估算,涉及时辰的结论可信度略降"}</small>
        </div>
      </header>

      <ReportToc items={[
        { id: "c-portrait", label: "人生画像" },
        { id: "c-pattern", label: "格局" },
        { id: "c-edu", label: "学业" },
        { id: "c-career", label: "事业" },
        { id: "c-wealth", label: "财富" },
        { id: "c-love", label: "感情" },
        { id: "c-health", label: "健康" },
        { id: "c-children", label: "子女" },
        { id: "c-kin", label: "六亲" },
        { id: "ask", label: "AI 追问" },
      ]} />

      {/* ── 人生画像 ── */}
      <section className="mf-zr-card" id="c-portrait">
        <div className="mf-cs-head"><i>✧</i><h2>人生画像</h2><span>PORTFOLIO</span></div>
        <dl className="mf-cs-kv">
          <div><dt>旺衰定性</dt><dd>{consult.portrait.strengthLine}</dd></div>
          <div><dt>核心道法</dt><dd><b>「{consult.portrait.dao.name}」</b>——{consult.portrait.dao.explain}</dd></div>
          <div><dt>喜神</dt><dd>{consult.portrait.favorable.elements} —— {consult.portrait.favorable.meaning}</dd></div>
          <div><dt>忌神</dt><dd>{consult.portrait.unfavorable.elements} —— {consult.portrait.unfavorable.meaning}</dd></div>
        </dl>
        <h3 className="mf-zr-sub">神煞底色</h3>
        <dl className="mf-cs-kv">
          {consult.portrait.shenSha.map((item) => (
            <div key={item.name}><dt>{item.name} · {item.value}</dt><dd>{item.meaning}</dd></div>
          ))}
        </dl>
        <h3 className="mf-zr-sub">性格与行为模式</h3>
        <p className="mf-cs-p">{consult.portrait.temperament}</p>
      </section>

      {/* ── ❖ 格局 ── */}
      <section className="mf-zr-card" id="c-pattern">
        <div className="mf-cs-head"><i>❖</i><h2>格局</h2><span>STRUCTURE</span></div>
        <p className="mf-cs-p"><b>月令格局:</b>{consult.pattern.monthGrid}</p>
        <h3 className="mf-zr-sub">命盘结构特征</h3>
        {consult.pattern.structures.map((item) => (
          <p className="mf-cs-p" key={item.rel}><b>{item.rel}:</b>{item.text}</p>
        ))}
        <details className="mf-l3-basis"><summary>查看完整四柱排盘</summary>
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
            <div><small>能量状态</small><b>{profile.summary.strength}</b></div>
            <div><small>喜用五行</small><b>{profile.summary.favorable.join("、")}</b></div>
            <div><small>需节制</small><b>{profile.summary.cautious.join("、")}</b></div>
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
          <p className="mf-zr-chart-note">真太阳时 {chart.trueSolar.adjustedTime}({chart.trueSolar.city},校正 {chart.trueSolar.totalCorrectionMin} 分钟)· 起运 {chart.daYun.startText}</p>
        </details>
      </section>

      {/* ── ✎ 学业 ── */}
      <section className="mf-zr-card" id="c-edu">
        <div className="mf-cs-head"><i>✎</i><h2>学业</h2><span>EDUCATION</span></div>
        <dl className="mf-cs-kv">
          <div><dt>学历评估</dt><dd>{consult.education.degree}</dd></div>
          <div><dt>适合专业</dt><dd>{consult.education.majors.join(" / ")}</dd></div>
          <div><dt>考运关键节点</dt><dd>利考试考证:{consult.education.examGood.join("、") || "近十年印星流年偏少,重在积累"}{consult.education.examBad.length ? `;易分心内耗:${consult.education.examBad.join("、")}` : ""}</dd></div>
        </dl>
      </section>

      {/* ── ◈ 事业 ── */}
      <section className="mf-zr-card" id="c-career">
        <div className="mf-cs-head"><i>◈</i><h2>事业</h2><span>CAREER</span></div>
        <p className="mf-cs-p"><b>职业方向:</b>{consult.career.direction}</p>
        <p className="mf-cs-p"><b>管理与领导力:</b>{consult.career.management}</p>
        <dl className="mf-cs-kv">
          <div><dt>贵人</dt><dd>{consult.career.guiren.replace("贵人:", "")}</dd></div>
          <div><dt>小人</dt><dd>{consult.career.xiaoren.replace("小人:", "")}</dd></div>
          <div><dt>与上级关系</dt><dd>{consult.career.boss.replace("与上级:", "")}</dd></div>
        </dl>
        <h3 className="mf-zr-sub">一生事业轨迹</h3>
        <div className="mf-cs-timeline">
          {consult.career.lifetime.map((step) => (
            <div className={step.current ? "is-current" : ""} key={step.ganzhi + step.years}>
              <b>{step.ganzhi}</b><span>{step.age} · {step.years}</span><em>{step.score}分</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-zr-sub">近期流年事业</h3>
        <div className="mf-cs-years">
          {consult.career.years.map((year) => (
            <div className={year.score < 40 ? "is-warn" : year.score >= 70 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi} · {year.tag}</span><em>{year.score}分</em>
              <p>{year.action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ✦ 财富 ── */}
      <section className="mf-zr-card" id="c-wealth">
        <div className="mf-cs-head"><i>✦</i><h2>财富</h2><span>WEALTH</span></div>
        <p className="mf-cs-disclaimer">{consult.wealth.disclaimer}</p>
        <p className="mf-cs-p"><b>一生财富高度:</b>你的财富量级在 <b className="mf-cs-range">{consult.wealth.range}</b> 之间。{consult.wealth.reason}。</p>
        <p className="mf-cs-p"><b>主要获财方式:</b>{consult.wealth.source}。</p>
        <h3 className="mf-zr-sub">一生财富大运</h3>
        <div className="mf-cs-timeline">
          {consult.wealth.lifetime.map((step) => (
            <div key={step.ganzhi + step.age}>
              <b>{step.ganzhi}</b><span>{step.age}</span><em>{step.trend}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-zr-sub">近期流年财富</h3>
        <div className="mf-cs-years">
          {consult.wealth.years.map((year) => (
            <div key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi} · {year.tag}</span>
              <p>{year.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ♡ 感情 ── */}
      <section className="mf-zr-card" id="c-love">
        <div className="mf-cs-head"><i>♡</i><h2>感情</h2><span>RELATIONSHIP</span></div>
        <h3 className="mf-zr-sub">配偶特征</h3>
        <dl className="mf-zr-kv">
          {consult.love.spouse.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}
        </dl>
        <p className="mf-cs-p"><b>对方家庭:</b>{consult.love.family}</p>
        <p className="mf-cs-p"><b>婚姻稳定性:</b>{consult.love.stability}</p>
        <h3 className="mf-zr-sub">一生婚恋大运</h3>
        <div className="mf-cs-timeline">
          {consult.love.lifetime.map((step) => (
            <div key={step.ganzhi + step.age}>
              <b>{step.ganzhi}</b><span>{step.age}</span><em>{step.tag}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-zr-sub">近期感情流年</h3>
        <div className="mf-cs-years">
          {consult.love.years.map((year) => (
            <div className={year.warn ? "is-warn" : year.prob >= 45 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi}年 · 缘分概率</span><em>{year.prob}%</em>
              <p>{year.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ✚ 健康 ── */}
      <section className="mf-zr-card" id="c-health">
        <div className="mf-cs-head"><i>✚</i><h2>健康</h2><span>HEALTH</span></div>
        <dl className="mf-cs-kv">
          <div><dt>身体薄弱环节</dt><dd>{consult.health.organs.join(";")}</dd></div>
          <div><dt>急性/慢性信号</dt><dd>{consult.health.acute}</dd></div>
          <div><dt>心理健康倾向</dt><dd>{consult.health.mental}</dd></div>
        </dl>
        <p className="mf-cs-disclaimer">健康模块基于传统五行对应文化的提示,不构成医学诊断建议。</p>
      </section>

      {/* ── ❀ 子女 ── */}
      <section className="mf-zr-card" id="c-children">
        <div className="mf-cs-head"><i>❀</i><h2>子女</h2><span>CHILDREN</span></div>
        <dl className="mf-cs-kv">
          <div><dt>子女缘分</dt><dd>{consult.children.fate}</dd></div>
          <div><dt>性别倾向</dt><dd>{consult.children.gender}</dd></div>
          <div><dt>子女关系</dt><dd>{consult.children.relation}</dd></div>
        </dl>
      </section>

      {/* ── ⊹ 六亲 ── */}
      <section className="mf-zr-card" id="c-kin">
        <div className="mf-cs-head"><i>⊹</i><h2>六亲</h2><span>FAMILY TIES</span></div>
        <dl className="mf-cs-kv">
          <div><dt>父亲</dt><dd>{consult.family.father.replace("偏财", "偏财(父星)")}</dd></div>
          <div><dt>母亲</dt><dd>{consult.family.mother.replace("印星", "印星(母星)")}</dd></div>
          <div><dt>兄弟姐妹/同辈</dt><dd>{consult.family.siblings.replace("比劫", "比劫(同辈星)")}</dd></div>
        </dl>
      </section>

      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} /></div>

      <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读,量化评分与财富区间为结构信号的估算表达,仅供娱乐与自我观察参考,不构成医疗、法律或投资建议。</p>
    </div>
  );
}
