import { notFound } from "next/navigation";
import ReportTopbar from "../../../../report-topbar";
import StarReadingReport, { extractFortuneData } from "../../../../star-reading-report";
import FortuneCurveCard from "../../../../fortune-curve";
import PillarsCard from "../../../../pillars-card";
import { getConsultOverride, parseStaticReadingContent, type ConsultOverrideContent } from "../../../../myfate-consult-override-store";
import { getCelebrityVedicBirth, getPublishedStar, getPublishedStarList, recordStarReportView } from "../../../../myfate-stars-server";
import { requirePageUser } from "../../../../require-page-user";
import { ReadingProgress } from "../../../../components/reading-tools";
import { buildBaziChart } from "../../../../myfate-bazi-engine";

export const dynamic = "force-dynamic";


// 报告内容以 consult_overrides 手动上传为准(single-full-v3 统一口径);
// 四柱优先取上传的 heroPillars,缺省回退档案三柱
function heroPillarsOf(consult: ConsultOverrideContent | null, threePillars: string): string[] {
  if (consult?.heroPillars?.length) return consult.heroPillars.slice(0, 4);
  return threePillars.split("·").map((part) => part.trim()).filter(Boolean).slice(0, 4);
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

  // ── 报告内容未上传(或仍是待替换的旧结构):占位提示,不扣费、不解锁、不开放追问 ──
  const staticReport = parseStaticReadingContent(consult);
  if (!staticReport) {
    return (
      <div className="mf-zr mf-zr-narrow">
        <ReportTopbar fromReports={from === "reports" && !prevStarId} backHref={backHref} title={personName || star.name} subtitle={heroPillars.join(" ")}  showShare shareTitle={`${personName || star.name} 的生辰画像`} />

        <PillarsCard pillars={heroPillars} />
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
  // 出生时间为公开资料推算口径:恢复四柱展示——年/月/日为确定柱,时柱按存档时间实时排盘补出,
  // 标签标注「时·推算」与确定性区分;无出生资料时回退档案三柱。
  const staticPillars = chart ? chart.pillars.map((pillar) => pillar.ganzhi) : heroPillarsOf(consult, star.threePillars);
  return (
    <div className="mf-zr mf-zr-narrow">
      <ReportTopbar fromReports={from === "reports" && !prevStarId} backHref={backHref} title={personName || star.name} subtitle={staticPillars.join(" ")} showShare shareTitle={`${personName || star.name} 的生辰画像`} />
      <ReadingProgress starId={id} />
      <PillarsCard pillars={staticPillars} hourEstimated={staticPillars.length > 3} />
      {(() => {
        const fortune = extractFortuneData(staticReport, Number((birth?.birthDate ?? star.birthDate).slice(0, 4)));
        return fortune ? (
          <FortuneCurveCard careerLifetime={fortune.careerLifetime} wealthLifetime={fortune.wealthLifetime} loveMarriage={fortune.loveMarriage} currentAge={fortune.currentAge} />
        ) : null;
      })()}
      <StarReadingReport content={staticReport} />
      <p className="mf-zr-note">本报告基于子平八字体系(四柱、十神、格局、刑冲合害)对静态命局做文化解读，不构成科学预测</p>
    </div>
  );
}
