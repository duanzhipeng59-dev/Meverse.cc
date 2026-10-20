import { notFound, redirect } from "next/navigation";
import StarAskPanel from "./ask-panel";
import ReportTopbar from "../../../../report-topbar";
import FortuneCurveCard from "../../../../fortune-curve";
import { getConsultOverride, type ConsultOverrideContent } from "../../../../myfate-consult-override-store";
import { getCelebrityVedicBirth, getPublishedStar, getPublishedStarList, hasStarReportView, recordStarReportView } from "../../../../myfate-stars-server";
import { portraitImage } from "../../../../myfate-image";
import { requirePageUser } from "../../../../require-page-user";
import Link from "next/link";
import { ReadingProgress } from "../../../../components/reading-tools";
import { staticReadingSchema } from "../../../../myfate-static-reading";
import StaticReadingReport from "../../../reading/[id]/static-reading-report";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";

export const dynamic = "force-dynamic";

// 追问建议与静态命局红线一致:不引导流年/财富等预测性问题
const ASK_SUGGESTIONS = [
  "TA 的性格底色适合怎样的合作方式？",
  "TA 的格局在事业上怎么落地？",
  "和 TA 相处最需要注意什么？",
];

const PILLAR_LABELS = ["年", "月", "日", "时"];

// 章节目录(与正文 section id 一一对应)
// 报告内容以 consult_overrides 手动上传为准;四柱优先取上传的 heroPillars,缺省回退档案三柱
function heroPillarsOf(consult: ConsultOverrideContent | null, threePillars: string): string[] {
  if (consult?.heroPillars?.length) return consult.heroPillars.slice(0, 4);
  return threePillars.split("·").map((part) => part.trim()).filter(Boolean).slice(0, 4);
}

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

function HeroBlock({ starName, portraitSrc, birthLine, heroPillars, heroBadges }: { starName: string; portraitSrc: string; birthLine: string; heroPillars: string[]; heroBadges?: string[] }) {
  return (
    <header className="mf-zr-hero">
      {/* CSS 已按 108×134 object-fit:cover 裁切,直接用 240w WebP 缩放版,不再拉原图 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portraitImage(portraitSrc, 240)} alt={starName} />
      <div className="mf-zr-hero-copy">
        <h1>{starName} 的 AI 生辰画像</h1>
        <small>出生 · {birthLine}</small>
        {heroBadges?.length ? (
          <div className="mf-zr-summary" aria-label="命盘核心摘要">
            {heroBadges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
        ) : null}
      </div>
      <div className="mf-zr-hero-pillars" aria-label="四柱">
        {heroPillars.map((ganzhi, index) => (
          <span key={`${ganzhi}-${index}`}>
            <small>{PILLAR_LABELS[index] ?? "柱"}</small>
            <b>{ganzhi}</b>
          </span>
        ))}
      </div>
    </header>
  );
}

export default async function StarReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; prev?: string }> }) {
  const { id } = await params;
  const { from, prev } = await searchParams;
  // 权限先行;其余互不依赖的只读请求(明星资料/开关/解锁记录/报告内容/列表)并行获取。
  const user = await requirePageUser(`/home/relationship-test/${id}/test`);
  const [star, viewed, consult, birth, allStars] = await Promise.all([
    getPublishedStar(id),
    hasStarReportView(user.id, id),
    getConsultOverride(id),
    getCelebrityVedicBirth(id),
    getPublishedStarList(),
  ]);
  if (!star) notFound();

  // 顶栏身份块:中文名(固定要求不显示英文艺名) + 四柱干支
  const roleDash = star.role.indexOf("-");
  const personName = roleDash > 0 ? star.role.slice(roleDash + 1).trim() : "";
  const heroPillars = heroPillarsOf(consult, star.threePillars);
  const others = allStars.filter((item) => item.id !== id).slice(0, 8);
  // 经"继续探索"从其他报告跳入时,返回按钮回上一份报告;否则回探索页
  const prevStarId = prev && allStars.some((item) => item.id === prev) ? prev : null;
  // 返回目标:从其它报告跳入回上一份报告,否则回本人的预览页(而非发现页)
const backHref = prevStarId ? `/home/relationship-test/${prevStarId}/test` : `/home/relationship-test/${id}`;
  const birthLine = `${star.birthDate.replaceAll("-", ".")} · ${birth?.birthPlace || "首尔 · 韩国"}`;
  const currentAge = Number.isFinite(Number(star.birthDate.slice(0, 4))) ? new Date().getFullYear() - Number(star.birthDate.slice(0, 4)) : null;

  // ── 报告内容未上传:占位提示,不扣费、不解锁、不开放追问 ──
  if (!consult) {
    return (
      <div className="mf-zr">
        <ReportTopbar fromReports={from === "reports" && !prevStarId} backHref={backHref} title={personName || star.name} subtitle={heroPillars.join(" ")}  showShare shareTitle={`${personName || star.name} 的生辰画像`} />

        <div className="mf-zr-overview">
          <HeroBlock starName={personName || star.name} portraitSrc={star.portraitSrc} birthLine={birthLine} heroPillars={heroPillars} />
        </div>

        <section className="mf-zr-card mf-doc">
          <div className="mf-doc-head"><i aria-hidden="true">✦</i><h2>报告准备中</h2></div>
          <p className="mf-doc-p">这份生辰画像报告尚未上传，内容正在人工准备与校对中，完成后即可查看。</p>
        </section>        <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读</p>
      </div>
    );
  }

  // ── 统一体系:static 两阶段报告(single-static-v2)与个人解读同一渲染/同一红线 ──
  // 四柱与徽章由引擎按出生资料实时排盘(content 不再携带 chart 事实,与个人解读一致)
  const staticParsed = staticReadingSchema.safeParse(consult);
  if (staticParsed.success) {
    void recordStarReportView(user.id, id, "bazi");
    const chart = birth ? buildBaziChart({
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      gender: birth.gender === "female" ? "female" : "male",
      city: { id: birth.starId, name: birth.birthPlace || "首尔 · 韩国", lat: birth.lat, lon: birth.lon, tz: birth.tz },
    }) : null;
    const profile = chart ? buildBaziLifeProfile(chart) : null;
    const staticPillars = chart ? chart.pillars.map((pillar) => pillar.ganzhi) : heroPillarsOf(consult, star.threePillars);
    const staticBadges = chart && profile ? [chart.dayMaster, profile.summary.strength, `喜${profile.summary.favorable.join("·")}`] : undefined;
    return (
      <div className="mf-zr">
        <ReportTopbar fromReports={from === "reports" && !prevStarId} backHref={backHref} title={personName || star.name} subtitle={staticPillars.join(" ")} showShare shareTitle={`${personName || star.name} 的生辰画像`} />
        <ReadingProgress starId={id} />
        <div className="mf-zr-overview">
          <HeroBlock starName={personName || star.name} portraitSrc={star.portraitSrc} birthLine={birthLine} heroPillars={staticPillars} heroBadges={staticBadges} />
        </div>
        <StaticReadingReport content={staticParsed.data} showAdvice={false} />
        <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} /></div>
        <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、刑冲合害)对静态命局做文化解读，不构成科学预测</p>
      </div>
    );
  }

  // 免费开放:仅记录阅读历史(用于「最近阅读」与跨设备同步)
  void recordStarReportView(user.id, id, "bazi");

  return (
    <div className="mf-zr">
      <ReportTopbar fromReports={from === "reports" && !prevStarId} backHref={backHref} title={personName || star.name} subtitle={heroPillars.join(" ")} showShare shareTitle={`${personName || star.name} 的生辰画像`} />
      <ReadingProgress starId={id} />
      <div className="mf-zr-overview">
      <HeroBlock starName={personName || star.name} portraitSrc={star.portraitSrc} birthLine={birthLine} heroPillars={heroPillars} heroBadges={consult.heroBadges} />



      {/* ── 人生运势曲线(与人物信息同属深色概览区,数据来自上传内容) ── */}
      <FortuneCurveCard
        careerLifetime={consult.career.lifetime}
        wealthLifetime={consult.wealth.lifetime}
        loveMarriage={consult.love.lifetime.map((step) => ({ age: step.age, tag: step.tag }))}
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
              <span>{step.age.replace(/^约/, "")}</span><em>{step.score}分</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期流年事业</h3>
        <div className="mf-cs-years">
          {consult.career.years.map((year) => (
            <div className={year.score < 40 ? "is-warn" : year.score >= 70 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><em>{year.score}分</em>
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
              <span>{step.age.replace(/^约/, "")}</span><em>{step.trend}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期流年财富</h3>
        <div className="mf-cs-years">
          {consult.wealth.years.map((year) => (
            <div className={year.score < 40 ? "is-warn" : year.score >= 70 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><em>{year.score}分</em>
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
              <span>{step.age.replace(/^约/, "")}</span><em>{step.tag}</em>
              <p>{step.note}</p>
            </div>
          ))}
        </div>
        <h3 className="mf-doc-sub">近期感情流年</h3>
        <div className="mf-cs-years">
          {consult.love.years.slice(0, 10).map((year) => (
            <div className={year.warn ? "is-warn" : year.prob >= 45 ? "is-good" : ""} key={year.year}>
              <b>{year.year}</b><em>缘分概率 {year.prob}%</em>
              <p>{year.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ✚ 健康 / ❀ 子女 / ⊹ 六亲 章节已下线 ── */}

      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} /></div>      <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、神煞、大运流年)做文化解读</p>
    </div>
  );
}
