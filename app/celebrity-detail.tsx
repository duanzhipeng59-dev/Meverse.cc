import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import AuthEntryLink from "./auth-entry-link";
import ReportAwareEntry from "./home/celebrity-match/report-aware-entry";

export default function CelebrityDetail({
  star,
  backHref,
  workspace = false,
  others = [],
  baziBrief = "",
  baziHeadline = "",
}: {
  star: StarProfile;
  backHref: string;
  workspace?: boolean;
  others?: Array<Pick<StarProfile, "id" | "name" | "portraitSrc">>;
  baziBrief?: string;
  baziHeadline?: string;
}) {
  return (
    <div className={workspace ? "mf-workspace-detail" : "mf-page mf-detail-page"}>
      {workspace ? (
        <div className="mf-workspace-detail-topbar">
          <Link className="mf-back-link" href={backHref} aria-label="返回工作区">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>返回工作区</span>
          </Link>
          <span>明星正缘</span>
        </div>
      ) : (
        <header className="mf-header">
          <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
          <Link className="mf-back-link" href={backHref}>← 返回选择</Link>
        </header>
      )}

      <div className="mf-detail-main">
        <section className="mf-detail-portrait-wrap">
          <div
            className="mf-detail-portrait"
            style={{ "--portrait-image": `url("${star.portraitSrc}")` } as React.CSSProperties}
            role="img"
            aria-label={`${star.name}的人物肖像`}
          />
          <div className="mf-floating-note"><span>✦</span><strong>{star.matchCount}</strong><small>浏览</small></div>
        </section>

        <section className="mf-detail-copy">
          <span className="mf-kicker">{star.role}</span>
          <h1>{star.name}</h1>
          {baziHeadline ? <p className="mf-detail-tagline">{baziHeadline}</p> : <p className="mf-detail-tagline">“{star.tagline}”</p>}
          <p className="mf-profile-basis">出生日期 {star.birthDate}</p>
          <div className="mf-detail-description">
            <p>{baziBrief || star.description}</p>
          </div>
          {workspace ? (
            <ReportAwareEntry starId={star.id} />
          ) : (
            <AuthEntryLink className="mf-primary-button mf-detail-cta" href={`/home/relationship-test/${star.id}/test`}>
              AI 生辰解读 <span>→</span>
            </AuthEntryLink>
          )}
          <AuthEntryLink className="mf-secondary-button mf-detail-cta mf-detail-astro-cta" href={`/home/relationship-test/${star.id}/astrology`}>
            AI 星盘解读 <span>→</span>
          </AuthEntryLink>
          <p className="mf-detail-hint">点击即可查看由八字引擎实时生成的完整 AI 生辰画像</p>
          <p className="mf-bazi-note">分析基于八字（四柱、藏干、十神、五行、大运与流年），仅供文化娱乐</p>
        </section>
      </div>

      {others.length ? (
        <section className="mf-detail-others" aria-labelledby="mf-detail-others-title">
          <h2 id="mf-detail-others-title">继续探索其他偶像</h2>
          <div className="mf-detail-others-row">
            {others.map((item) => (
              <Link className="mf-detail-others-card" href={workspace ? `/home/relationship-test/${item.id}` : `/celebrity/${item.id}`} key={item.id}>
                <span className="mf-detail-others-portrait" style={{ backgroundImage: `url("${item.portraitSrc}")` }} role="img" aria-label={item.name} />
                <b>{item.name}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
