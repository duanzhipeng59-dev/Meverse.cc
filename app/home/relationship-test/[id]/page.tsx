import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";
import PreviewActions from "./preview-actions";
import ReportTopbar from "../../../report-topbar";
import { getConsultOverride } from "../../../myfate-consult-override-store";
import { parseStaticReadingContent } from "../../../myfate-consult-override-store";
import { getPublishedStar, getPublishedStarList, getCelebrityVedicBirth, dayMasterOf } from "../../../myfate-stars-server";
import { portraitImage, portraitOgImage } from "../../../myfate-image";
import { Tag } from "../../../components/ui";
import { pushRecentStar } from "../../celebrity-match/celebrity-browser";
import StarVisitTracker from "./preview-visit";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function groupOf(role: string) {
  const dash = role.indexOf("-");
  return dash > 0 ? role.slice(0, dash).trim() : role;
}
function personOf(role: string) {
  const dash = role.indexOf("-");
  return dash > 0 ? role.slice(dash + 1).trim() : role;
}

// 人物公开预览页的 SEO 信息:按实际档案生成 title/description/OG 图。
// UUID 是私人报告(未登录 302 跳登录页),标记 noindex 双保险。
// 查无此人时在 metadata 阶段 notFound():metadata 先于流式壳冲刷执行,拿到真正的
// 404 状态码(放在页面组件里 notFound 会落在 200 壳内,成为 SEO 软 404)。
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (UUID_PATTERN.test(id)) return { title: "生辰画像报告", robots: { index: false, follow: false } };

  const star = await getPublishedStar(id);
  if (!star) notFound();

  const dayMaster = dayMasterOf(star.threePillars);
  const title = `${star.name}${star.nameEn ? ` ${star.nameEn}` : ""}的生辰画像`;
  const description = `${star.name}（${star.birthDate.replaceAll("-", ".")} 出生${dayMaster ? `，${dayMaster}日主` : ""}）的 AI 生辰画像：性格天赋、事业财富与感情运势解读。${star.description.slice(0, 50)}`;
  return {
    title,
    description,
    alternates: { canonical: `/home/relationship-test/${id}` },
    openGraph: {
      title,
      description,
      url: `/home/relationship-test/${id}`,
      images: [{ url: portraitOgImage(star.portraitSrc), alt: `${star.name}的人物肖像` }],
    },
  };
}

export default async function RelationshipTargetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams;

  // UUID = 保存的自定义报告(旧链路保留)
  if (UUID_PATTERN.test(id)) {
    const { requirePageUser } = await import("../../../require-page-user");
    await requirePageUser(`/home/relationship-test/${id}`);
    return <ReportDetailWorkspace reportId={id} section="relationship-test" />;
  }

  // 人物 id → 预览页
  const [star, consult, birth, allStars] = await Promise.all([
    getPublishedStar(id),
    getConsultOverride(id),
    getCelebrityVedicBirth(id),
    getPublishedStarList(),
  ]);
  if (!star) notFound();

  const complete = Boolean(star.birthDate && birth?.birthTime);
  // 三条报告摘要:统一九章结构取前章 title+summary,缺省回退档案描述
  const staticReport = consult ? parseStaticReadingContent(consult) : null;
  const digest: Array<{ title: string; text: string }> = staticReport
    ? Object.values(staticReport.sections).slice(0, 3).map((section) => ({ title: section.title, text: section.summary.slice(0, 90) }))
    : [
        { title: "人物简介", text: star.description.slice(0, 90) },
      ];
  const chapters = consult
    ? [["◐", "人生画像"], ["❖", "格局"], ["✎", "学业"], ["◈", "事业"], ["✦", "财富"], ["♡", "感情"], ["✚", "健康"], ["❀", "子女"], ["⊹", "六亲"]]
    : [];
  const related = allStars.filter((item) => item.id !== id && groupOf(item.role) === groupOf(star.role)).slice(0, 4);
  const hasReport = Boolean(consult);

  return (
    <div className="mf-workspace-content">
    <div className="mf-preview">
      <ReportTopbar fromReports={from === "reports"} backHref={from === "profile" ? "/home/profile" : undefined} backLabel="" />
      <StarVisitTracker starId={id} />
      <header className="mf-preview-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitImage(star.portraitSrc, 360)} alt={`${star.name}的人物肖像`} />
        <div className="mf-preview-head-copy">
          <h1>{personOf(star.role) || star.name}</h1>
          {star.nameEn ? <p className="mf-preview-en">{star.nameEn}</p> : null}
          <p className="mf-preview-group">{groupOf(star.role)}</p>
          <p className="mf-preview-birth">出生 · {star.birthDate.replaceAll("-", ".")}{birth?.birthPlace ? ` · ${birth.birthPlace}` : ""}</p>
          <div className="mf-preview-tags">
            <Tag tone={complete ? "good" : "warn"}>{complete ? "资料完整" : "资料待补充"}</Tag>
            {dayMasterOf(star.threePillars) ? <Tag>{dayMasterOf(star.threePillars)}</Tag> : null}
            {(star.traits ?? []).slice(0, 3).map((trait) => <Tag key={trait}>{trait}</Tag>)}
          </div>
        </div>
      </header>

      <PreviewActions starId={id} nameEn={star.nameEn} />

      {digest.length ? (
        <section className="mf-preview-section" aria-label="报告摘要">
          <h2>报告摘要</h2>
          {digest.map((item) => (
            <blockquote key={item.title}>
              <b>{item.title}</b>
              <p>{item.text}…</p>
            </blockquote>
          ))}
          {!hasReport ? <p className="mf-preview-note">完整报告正在准备中,可先浏览人物简介。</p> : null}
        </section>
      ) : null}

      {chapters.length ? (
        <section className="mf-preview-section" aria-label="报告章节">
          <h2>完整报告章节</h2>
          <ul className="mf-preview-chapters">
            {chapters.map(([icon, label]) => <li key={label}><i aria-hidden="true">{icon}</i>{label}</li>)}
          </ul>
        </section>
      ) : null}

      {related.length ? (
        <section className="mf-preview-section" aria-label="相关人物">
          <h2>相关人物</h2>
          <div className="mf-preview-related">
            {related.map((item) => (
              <Link href={`/home/relationship-test/${item.id}`} key={item.id}>
                <span style={{ backgroundImage: `url("${portraitImage(item.portraitSrc, 120)}")` }} role="img" aria-label={item.name} />
                <b>{item.name}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
    </div>
  );
}
