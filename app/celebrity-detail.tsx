import Link from "next/link";
import ReportLaunchButtons from "./report-launch-buttons";
import type { StarProfile } from "./myfate-data";

export default function CelebrityDetail({
  star,
  backHref,
  workspace = false,
  others = [],
  baziBrief = "",
  unlockedReportTypes = [],
}: {
  star: StarProfile;
  backHref: string;
  workspace?: boolean;
  others?: Array<Pick<StarProfile, "id" | "name" | "portraitSrc">>;
  baziBrief?: string;
  unlockedReportTypes?: Array<"bazi" | "astrology">;
}) {
  return (
    <div className={workspace ? "mf-workspace-detail" : "mf-page mf-detail-page"}>
      {workspace ? (
        <div className="mf-workspace-detail-topbar">
          <Link className="mf-back-link mf-icon-back" href={backHref} aria-label="返回">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <span>明星解读</span>
        </div>
      ) : (
        <header className="mf-header">
          <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
          <Link className="mf-back-link mf-icon-back" href={backHref} aria-label="返回">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
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
          <div className="mf-detail-description">
            <span className="mf-detail-section-label">PERSONA NOTES</span>
            <h2>人物解读</h2>
            <p>{baziBrief || star.description}</p>
          </div>
          <ReportLaunchButtons starId={star.id} unlocked={unlockedReportTypes} />
          <Link className="mf-dual-entry" href={`/home/dual-star-match?star=${star.id}`}>
            <span className="mf-dual-entry-icon" aria-hidden="true">✦</span>
            <span><b>AI 双星合盘</b><small>选择另一位明星，解读双人关系</small></span>
            <i aria-hidden="true">→</i>
          </Link>
          <p className="mf-detail-hint">报告基于公开信息与公开引擎推导</p>
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
