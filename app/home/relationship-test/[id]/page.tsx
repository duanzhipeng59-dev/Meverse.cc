import { notFound } from "next/navigation";
import Link from "next/link";
import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";
import PreviewActions from "./preview-actions";
import { getConsultOverride } from "../../../myfate-consult-override-store";
import { getPublishedStar, getPublishedStarList, getCelebrityVedicBirth } from "../../../myfate-stars-server";
import { portraitImage } from "../../../myfate-image";
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

export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
  // 三条报告摘要:优先上传报告的章节首段,缺省用档案描述
  const digest: Array<{ title: string; text: string }> = consult
    ? [
        { title: "人生画像", text: consult.portrait.strength.content.slice(0, 90) },
        { title: "格局", text: consult.pattern.monthGridRich.content.slice(0, 90) },
        { title: "感情", text: consult.love.spouse[0]?.text?.slice(0, 90) ?? consult.love.family.slice(0, 90) },
      ]
    : [
        { title: "人物简介", text: star.description.slice(0, 90) },
      ];
  const chapters = consult
    ? [["◐", "人生画像"], ["❖", "格局"], ["✎", "学业"], ["◈", "事业"], ["✦", "财富"], ["♡", "感情"]]
    : [];
  const related = allStars.filter((item) => item.id !== id && groupOf(item.role) === groupOf(star.role)).slice(0, 4);
  const hasReport = Boolean(consult);

  return (
    <div className="mf-preview">
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
            {star.mbti ? <Tag>{star.mbti}</Tag> : null}
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
  );
}
