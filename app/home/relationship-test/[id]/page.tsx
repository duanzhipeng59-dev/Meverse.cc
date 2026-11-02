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
import { SITE_URL } from "../../../site-url";
import { Tag } from "../../../components/ui";
import { pushRecentStar } from "../../celebrity-match/celebrity-browser";
import { wuxingTagStyle } from "../../../wuxing-tag";
import StarVisitTracker from "./preview-visit";
import TradDigest from "./trad-digest";
import TradText from "../../../trad-text";
import Trans from "../../../trans";

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
  const role = star.role.includes("-") ? star.role.split("-").slice(1).join("-").trim() : star.role;
  const title = `${star.name}${star.nameEn ? `（${star.nameEn}）` : ""}的八字命盘与生辰画像`;
  const description = `${star.name}（${role}）出生于 ${star.birthDate.replaceAll("-", ".")}${dayMaster ? `，八字日主${dayMaster}` : ""}。AI 深度解读${star.name}的性格天赋、事业财富、感情婚姻与大运流年，支持向 AI 命理师追问。`;
  return {
    title,
    description,
    keywords: [`${star.name}八字`, `${star.name}星座`, `${star.name}命理`, `${star.name}生辰`, `${star.name}AI解读`, "生辰画像", "八字解读"],
    alternates: { canonical: `/home/relationship-test/${id}` },
    openGraph: {
      title: `${star.name}${star.nameEn ? ` ${star.nameEn}` : ""}的生辰画像 · MeVerse`,
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
  // 摘要三条:章节 key + 截断摘要 + 该章完整内容(弹窗用);无报告时只有人物简介(不可点弹窗)
  const digest: Array<{ key: string; title: string; text: string; section?: { title: string; summary?: string; insights: Array<{ label: string; content: string }> } }> = staticReport
    ? Object.entries(staticReport.sections).slice(0, 3).map(([key, section]) => ({
        key,
        title: section.title,
        text: (section.summary ?? section.insights[0]?.content ?? "").slice(0, 90),
        section: {
          title: section.title,
          summary: section.summary,
          insights: section.insights.map((item) => ({ label: item.label, content: item.content })),
        },
      }))
    : [
        { key: "profile", title: "人物简介", text: star.description.slice(0, 90) },
      ];
  // 章节标签存 i18n key(简繁切换),图标不变
  const chapters = consult
    ? [["✦", "preview.chapter.fortune"], ["◐", "preview.chapter.portrait"], ["❖", "preview.chapter.pattern"], ["✎", "preview.chapter.study"], ["◈", "preview.chapter.career"], ["✦", "preview.chapter.wealth"], ["♡", "preview.chapter.love"], ["✚", "preview.chapter.health"], ["❀", "preview.chapter.children"], ["⊹", "preview.chapter.family"]]
    : [];
  // 同组合内链:放宽到 8 人(大组合如 SEVENTEEN 多人可互链),卡片带英文名+日主副行
  const related = allStars.filter((item) => item.id !== id && groupOf(item.role) === groupOf(star.role)).slice(0, 8);
  const hasReport = Boolean(consult);

  // ── SEO 结构化数据 ──
  const groupLabel = groupOf(star.role).replace(/\s*成员$/u, "").trim();
  const isRealGroup = Boolean(groupLabel && star.categories?.includes(groupLabel));
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: star.name,
    ...(star.nameEn ? { alternateName: star.nameEn } : {}),
    ...(star.birthDate ? { birthDate: star.birthDate } : {}),
    ...(star.gender ? { gender: star.gender } : {}),
    url: `${SITE_URL}/home/relationship-test/${id}`,
    image: `${SITE_URL}${portraitOgImage(star.portraitSrc)}`,
    description: (star.tagline || star.description).slice(0, 110),
    ...(isRealGroup ? { memberOf: { "@type": "Organization", name: groupLabel } } : {}),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "明星八字·生辰画像合集", item: `${SITE_URL}/home/relationship-test` },
      { "@type": "ListItem", position: 3, name: star.name },
    ],
  };

  return (
    <div className="mf-workspace-content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
    <div className="mf-preview">
      <ReportTopbar fromReports={from === "reports"} backHref={from === "profile" ? "/home/profile" : undefined} backLabel="" showShare shareTitle={`${star.name}${star.nameEn ? ` ${star.nameEn}` : ""} 的生辰画像`} />
      <StarVisitTracker starId={id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header className="mf-preview-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitImage(star.portraitSrc, 360)} alt={`${star.name}的肖像`} />
        <div className="mf-preview-head-copy">
          <h1 className={(personOf(star.role) || star.name).length > 8 ? "is-long-name" : undefined}><TradText text={personOf(star.role) || star.name} /></h1>
          {star.nameEn ? <p className="mf-preview-en">{star.nameEn}</p> : null}
          <p className="mf-preview-group"><TradText text={groupOf(star.role)} /></p>
          <p className="mf-preview-birth"><TradText text={`出生 · ${star.birthDate.replaceAll("-", ".")}${birth?.birthPlace ? ` · ${birth.birthPlace}` : ""}`} /></p>
          {/* 标签固定两枚:资料完整度 + 日主(底色取五行色);人物画像类 traits 标签不展示。
              「加入合盘」超链已隐藏(改为 hidden,保留组件待后续启用) */}
          <div className="mf-preview-tags">
            <Tag tone={complete ? "good" : "warn"}>{complete ? <Trans k="discover.tag.complete" /> : <Trans k="discover.tag.incomplete" />}</Tag>
            {dayMasterOf(star.threePillars) ? (
              <span className="mf-ui-tag is-default" style={wuxingTagStyle(dayMasterOf(star.threePillars))}>{dayMasterOf(star.threePillars)}</span>
            ) : null}
            <PreviewActions starId={id} starKey={`star:${id}`} hidden />
          </div>
        </div>
      </header>

      {digest.length ? (
        <section className="mf-preview-section" aria-label="报告摘要">
          <h2><Trans k="preview.digest" /></h2>
          <TradDigest items={digest} />
          {!hasReport ? <p className="mf-preview-note"><Trans k="preview.preparing" /></p> : null}
        </section>
      ) : null}

      {chapters.length ? (
        <section className="mf-preview-section" aria-label="报告章节">
          <h2><Trans k="preview.chapters" /></h2>
          <ul className="mf-preview-chapters">
            {chapters.map(([icon, labelKey]) => <li key={labelKey}><i aria-hidden="true">{icon}</i><Trans k={labelKey} /></li>)}
          </ul>
        </section>
      ) : null}

      {related.length ? (
        <section className="mf-preview-section" aria-label="相关人物">
          <h2>{isRealGroup ? <TradText text={`${groupLabel}成员的生辰画像`} /> : <Trans k="preview.related" />}</h2>
          <div className="mf-preview-related">
            {related.map((item) => (
              <Link href={`/home/relationship-test/${item.id}`} key={item.id} title={`${item.name}的八字命盘与生辰画像`}>
                <span style={{ backgroundImage: `url("${portraitImage(item.portraitSrc, 120)}")` }} role="img" aria-label={item.name} />
                <b><TradText text={item.name} /></b>
                <small>{[item.nameEn, dayMasterOf(item.threePillars)].filter(Boolean).join(" · ")}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
    </div>
  );
}
