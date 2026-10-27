import { notFound } from "next/navigation";
import StarAskPanel from "./ask-panel";
import ReportTopbar from "../../../../report-topbar";
import StarReadingReport from "../../../../star-reading-report";
import { getConsultOverride, parseStaticReadingContent, type ConsultOverrideContent } from "../../../../myfate-consult-override-store";
import { getCelebrityVedicBirth, getPublishedStar, getPublishedStarList, recordStarReportView } from "../../../../myfate-stars-server";
import { portraitImage } from "../../../../myfate-image";
import { requirePageUser } from "../../../../require-page-user";
import Link from "next/link";
import { ReadingProgress } from "../../../../components/reading-tools";
import { buildBaziChart } from "../../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../../myfate-bazi-profile";

export const dynamic = "force-dynamic";

// 追问建议与报告口径一致:不引导流年/财富等预测性问题
const ASK_SUGGESTIONS = [
  "TA 的性格底色适合怎样的合作方式？",
  "TA 的格局在事业上怎么落地？",
  "和 TA 相处最需要注意什么？",
];

const PILLAR_LABELS = ["年", "月", "日", "时"];

// 报告内容以 consult_overrides 手动上传为准(single-full-v3 统一口径);
// 四柱优先取上传的 heroPillars,缺省回退档案三柱
function heroPillarsOf(consult: ConsultOverrideContent | null, threePillars: string): string[] {
  if (consult?.heroPillars?.length) return consult.heroPillars.slice(0, 4);
  return threePillars.split("·").map((part) => part.trim()).filter(Boolean).slice(0, 4);
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
  // 权限先行;其余互不依赖的只读请求(明星资料/报告内容/出生资料/列表)并行获取。
  const user = await requirePageUser(`/home/relationship-test/${id}/test`);
  const [star, consult, birth, allStars] = await Promise.all([
    getPublishedStar(id),
    getConsultOverride(id),
    getCelebrityVedicBirth(id),
    getPublishedStarList(),
  ]);
  if (!star) notFound();

  // 顶栏身份块:中文名(固定要求不显示英文艺名) + 四柱干支
  const roleDash = star.role.indexOf("-");
  const personName = roleDash > 0 ? star.role.slice(roleDash + 1).trim() : "";
  const heroPillars = heroPillarsOf(consult, star.threePillars);
  // 经"继续探索"从其他报告跳入时,返回按钮回上一份报告;否则回探索页
  const prevStarId = prev && allStars.some((item) => item.id === prev) ? prev : null;
  // 返回目标:从其它报告跳入回上一份报告,否则回本人的预览页(而非发现页)
  const backHref = prevStarId ? `/home/relationship-test/${prevStarId}/test` : `/home/relationship-test/${id}`;
  const birthLine = `${star.birthDate.replaceAll("-", ".")} · ${birth?.birthPlace || "首尔 · 韩国"}`;

  // ── 报告内容未上传(或仍是待替换的旧结构):占位提示,不扣费、不解锁、不开放追问 ──
  const staticReport = parseStaticReadingContent(consult);
  if (!staticReport) {
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

  // ── 统一口径:手写 single-full-v3 九章报告;四柱与徽章按出生资料实时排盘 ──
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
      <StarReadingReport content={staticReport} />
      <div id="ask"><StarAskPanel starId={id} starName={star.name} suggestions={ASK_SUGGESTIONS} /></div>
      <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、刑冲合害)对静态命局做文化解读，不构成科学预测</p>
    </div>
  );
}
