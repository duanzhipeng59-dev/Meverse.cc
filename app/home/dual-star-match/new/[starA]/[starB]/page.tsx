import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ReportTopbar from "../../../../../report-topbar";
import DualConfirmActions from "./dual-confirm-actions";
import { getPublishedStar, getCelebrityVedicBirth } from "../../../../../myfate-stars-server";
import { buildDualChart } from "../../../../../myfate-dual-engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "双人合盘 · 偶像资料" };

// 合盘两段式第一步:点「合盘」后的资料确认页——详细展示两位偶像的组合、生日与四柱,
// 不创建报告、不扣费;点「开始分析」(dual-confirm-actions)才登录并开始生成。
// 用动态段而非查询串传 id:vinext 的静态路由不向页面透传 searchParams。
export default async function DualConfirmPage({ params }: { params: Promise<{ starA: string; starB: string }> }) {
  const { starA: idA, starB: idB } = await params;
  if (idA === idB) redirect("/home/dual-star-match");

  const [starA, starB] = await Promise.all([getPublishedStar(idA), getPublishedStar(idB)]);
  if (!starA || !starB) notFound();
  const [birthA, birthB] = await Promise.all([getCelebrityVedicBirth(idA), getCelebrityVedicBirth(idB)]);
  // 手输 URL 绕过选择器的情况:资料不完整就送回选择页(选择器只放行资料完整的候选)
  if (!birthA || !birthB) redirect("/home/dual-star-match");

  const people = [starA, starB].map((star, index) => {
    const birth = index === 0 ? birthA : birthB;
    const chart = buildDualChart(birth).chart;
    return {
      name: star.name,
      dayMaster: chart.dayMaster,
      // 四柱保留「年柱」全称作小卡标签;干支拆天干/地支两行竖排大字
      pillars: chart.pillars.map((pillar) => ({ label: pillar.label, gan: pillar.ganzhi[0] ?? "", zhi: pillar.ganzhi[1] ?? "" })),
    };
  });

  return (
    <div className="mf-zr">
      <ReportTopbar backHref="/home/dual-star-match" backLabel="" title={`${people[0].name} × ${people[1].name}`} />

      <div className="mf-dual-status mf-dual-confirm">
        <div className="mf-dual-status-people">
          {people.map((person) => (
            <figure key={person.name}>
              <b>{person.name}</b>
              <div className="mf-dual-confirm-pillars" aria-label="四柱">
                {person.pillars.map((pillar) => (
                  <span key={pillar.label}><small>{pillar.label}</small><b>{pillar.gan}</b><b>{pillar.zhi}</b></span>
                ))}
              </div>
              <em className="mf-dual-confirm-dm">日主 · {person.dayMaster}</em>
            </figure>
          ))}
        </div>
        <p className="mf-dual-status-note mf-dual-confirm-hint">点击下方按钮，看见你们的合盘。</p>
        <DualConfirmActions starA={idA} starB={idB} />
      </div>
    </div>
  );
}
