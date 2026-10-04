import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import ReportTopbar from "../../../../report-topbar";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";
import { buildStarBaziReport } from "../../../../myfate-star-bazi-report";
import { buildConsultReport } from "../../../../myfate-portrait-consult";
import { CONSULT_OVERRIDES } from "../../../../myfate-consult-overrides";
import FortuneCurveCard from "../../../../fortune-curve";
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


// ── 文档型章节组件(连续阅读,重点词由结构化 highlights 提供) ──
function Highlighted({ content, highlights }: { content: string; highlights: string[] }) {
  let parts: Array<{ text: string; hl: boolean }> = [{ text: content, hl: false }];
  for (const hl of highlights) {
    const next: Array<{ text: string; hl: boolean }> = [];
    for (const part of parts) {
      if (part.hl || !part.text.includes(hl)) {
        next.push(part);
        continue;
      }
      const segments = part.text.split(hl);
      segments.forEach((seg, i) => {
        if (seg) next.push({ text: seg, hl: false });
        if (i < segments.length - 1) next.push({ text: hl, hl: true });
      });
    }
    parts = next;
  }
  return <>{parts.map((part, index) => part.hl ? <b className="mf-doc-hl" key={index}>{part.text}</b> : <span key={index}>{part.text}</span>)}</>;
}

function DocRich({ label, data }: { label: string; data: { content: string; highlights: string[] } }) {
  return (
    <p className="mf-doc-p">
      {label ? <b className="mf-doc-label">{label}：</b> : null}
      <Highlighted content={data.content} highlights={data.highlights} />
    </p>
  );
}

function DocIndent({ label, content }: { label: string; content: string }) {
  return (
    <p className="mf-doc-indent">
      <b>{label}：</b>
      {content}
    </p>
  );
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
  // 人工精校内容优先(RM),其余明星走模板引擎
  const consult = CONSULT_OVERRIDES[id] ?? buildConsultReport(chart, profile, report);
  const currentAge = Number.isFinite(Number(star.birthDate.slice(0, 4))) ? new Date().getFullYear() - Number(star.birthDate.slice(0, 4)) : null;

  return (
    <div className="mf-zr">
      <ReportTopbar starId={id} fromReports={from === "reports"} />

      <div className="mf-zr-overview">
      <header className="mf-zr-hero">
        <Image src={star.portraitSrc} alt={star.name} width={96} height={120} sizes="96px" unoptimized />
        <div className="mf-zr-hero-copy">
          <span className="mf-zr-kicker">AI BIRTH PORTRAIT · {star.role}</span>
          <h1>{star.name} 的 AI 生辰画像</h1>
          <small>出生 · {star.birthDate.replaceAll("-", ".")} · {birth?.birthPlace || "首尔"} · {hasExactBirthTime ? "已按出生时刻校准" : "时辰暂按正午估算"}</small>
        </div>
        <div className="mf-zr-hero-pillars" aria-label="四柱">
          {report.pillars.map((pillar) => (
            <span key={pillar.label}>
              <small>{pillar.label.replace("柱", "")}</small>
              <b>{pillar.ganzhi[0]}{pillar.ganzhi[1]}</b>
            </span>
          ))}
        </div>
      </header>



      {/* ── 人生运势曲线(与人物信息同属深色概览区) ── */}
      <FortuneCurveCard
        careerLifetime={consult.career.lifetime}
        wealthLifetime={consult.wealth.lifetime}
        loveMarriage={report.love.marriageLuck.map((item) => ({ age: item.ageText, tag: item.tag }))}
        currentAge={currentAge}
      />
      </div>

      {/* ── ◐ 人生画像 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-portrait">
        <div className="mf-doc-head"><i aria-hidden="true">◐</i><h2>人生画像</h2></div>
        <DocRich label="旺衰定性" data={consult.portrait.strength} />
        <DocRich label="道法与喜忌" data={consult.portrait.dao} />
        <DocIndent label={consult.portrait.favorable.label} content={consult.portrait.favorable.content} />
        <DocIndent label={consult.portrait.unfavorable.label} content={consult.portrait.unfavorable.content} />
        {consult.portrait.neutral ? <DocIndent label={consult.portrait.neutral.label} content={consult.portrait.neutral.content} /> : null}
        <h3 className="mf-doc-sub">神煞底色</h3>
        {consult.portrait.shenSha.map((item) => (
          <DocIndent key={item.label} label={item.label} content={item.content} />
        ))}
        {consult.portrait.temperament.map((para, index) => (
          <DocRich key={index} label={index === 0 ? "性格与行为模式" : ""} data={para} />
        ))}
      </section>

      {/* ── ❖ 格局 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-pattern">
        <div className="mf-doc-head"><i aria-hidden="true">❖</i><h2>格局</h2></div>
        <DocRich label="月令格局" data={consult.pattern.monthGridRich} />
        <h3 className="mf-doc-sub">命盘结构特征</h3>
        {consult.pattern.structures.map((item) => (
          <DocIndent key={item.rel} label={item.rel} content={item.text} />
        ))}
      </section>

      {/* ── ✎ 学业 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-edu">
        <div className="mf-doc-head"><i aria-hidden="true">✎</i><h2>学业</h2></div>
        <DocIndent label="学历评估" content={consult.education.degree} />
        <DocIndent label="适合专业" content={`推荐方向：${consult.education.majors.join("；")}。`} />
        <DocIndent label="考运关键节点" content={`利于考试考证的年份：${consult.education.examGood.join("、") || "近十年印星流年偏少，重在平时积累"}。${consult.education.examBad.length ? `容易分心内耗的年份：${consult.education.examBad.join("、")}——这段时间别把重要考试压上去。` : ""}`} />
      </section>

      {/* ── ◈ 事业 · 文档型(时间轴保留) ── */}
      <section className="mf-zr-card mf-doc" id="c-career">
        <div className="mf-doc-head"><i aria-hidden="true">◈</i><h2>事业</h2></div>
        <DocIndent label="职业方向" content={consult.career.direction} />
        <DocIndent label="管理与领导力" content={consult.career.management} />
        <DocIndent label="贵人" content={consult.career.guiren.replace("贵人:", "")} />
        <DocIndent label="小人" content={consult.career.xiaoren.replace("小人:", "")} />
        <DocIndent label="与上级关系" content={consult.career.boss.replace("与上级:", "")} />
        <h3 className="mf-doc-sub">一生事业轨迹</h3>
        <div className="mf-cs-timeline">
          {consult.career.lifetime.map((step) => (
            <div className={step.current ? "is-current" : ""} key={step.ganzhi + step.years}>
              <b>{step.ganzhi}</b><span>{step.age} · {step.years}</span><em>{step.score}分</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期流年事业</h3>
        <div className="mf-cs-years">
          {consult.career.years.map((year) => (
            <div className={year.score < 40 ? "is-warn" : year.score >= 70 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi} · {year.tag}</span><em>{year.score}分</em>
              <p>{year.action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ✦ 财富 · 文档型(时间轴保留) ── */}
      <section className="mf-zr-card mf-doc" id="c-wealth">
        <div className="mf-doc-head"><i aria-hidden="true">✦</i><h2>财富</h2></div>
        <DocRich label="一生财富高度" data={consult.wealth.rangeRich} />
        <DocIndent label="主要获财方式" content={`${consult.wealth.source}。`} />
        <h3 className="mf-doc-sub">一生财富大运</h3>
        <div className="mf-cs-timeline">
          {consult.wealth.lifetime.map((step) => (
            <div key={step.ganzhi + step.age}>
              <b>{step.ganzhi}</b><span>{step.age}</span><em>{step.trend}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期流年财富</h3>
        <div className="mf-cs-years">
          {consult.wealth.years.map((year) => (
            <div key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi} · {year.tag}</span>
              <p>{year.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ♡ 感情 · 文档型(时间轴保留) ── */}
      <section className="mf-zr-card mf-doc" id="c-love">
        <div className="mf-doc-head"><i aria-hidden="true">♡</i><h2>感情</h2></div>
        <h3 className="mf-doc-sub">配偶特征</h3>
        {consult.love.spouse.map((item) => (
          <DocIndent key={item.label} label={item.label} content={item.text} />
        ))}
        <DocIndent label="对方家庭" content={consult.love.family} />
        <DocIndent label="婚姻稳定性" content={consult.love.stability} />
        <h3 className="mf-doc-sub">一生婚恋大运</h3>
        <div className="mf-cs-timeline">
          {consult.love.lifetime.map((step) => (
            <div key={step.ganzhi + step.age}>
              <b>{step.ganzhi}</b><span>{step.age}</span><em>{step.tag}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期感情流年</h3>
        <div className="mf-cs-years">
          {consult.love.years.map((year) => (
            <div className={year.warn ? "is-warn" : year.prob >= 45 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><span>{year.ganzhi}年 · 缘分概率</span><em>{year.prob}%</em>
              <p>{year.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ✚ 健康 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-health">
        <div className="mf-doc-head"><i aria-hidden="true">✚</i><h2>健康</h2></div>
        <DocIndent label="身体薄弱环节" content={consult.health.organs.join("；")} />
        <DocIndent label="急性/慢性信号" content={consult.health.acute} />
        <DocIndent label="心理健康倾向" content={consult.health.mental} />
      </section>

      {/* ── ❀ 子女 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-children">
        <div className="mf-doc-head"><i aria-hidden="true">❀</i><h2>子女</h2></div>
        <DocIndent label="子女缘分" content={consult.children.fate} />
        <DocIndent label="性别倾向" content={consult.children.gender} />
        <DocIndent label="子女关系" content={consult.children.relation} />
      </section>

      {/* ── ⊹ 六亲 · 文档型 ── */}
      <section className="mf-zr-card mf-doc" id="c-kin">
        <div className="mf-doc-head"><i aria-hidden="true">⊹</i><h2>六亲</h2></div>
        <DocIndent label="父亲" content={consult.family.father.replace("偏财", "偏财(父星)")} />
        <DocIndent label="母亲" content={consult.family.mother.replace("印星", "印星(母星)")} />
        <DocIndent label="兄弟姐妹/同辈" content={consult.family.siblings.replace("比劫", "比劫(同辈星)")} />
      </section>

      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} metered={metered} /></div>

      <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读,量化评分与财富区间为结构信号的估算表达,仅供娱乐与自我观察参考,不构成医疗、法律或投资建议。</p>
    </div>
  );
}
