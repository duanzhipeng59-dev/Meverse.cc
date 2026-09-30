import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import AuthEntryLink from "./auth-entry-link";
import ReportAwareEntry from "./home/celebrity-match/report-aware-entry";

export default function CelebrityDetail({
  star,
  backHref,
  workspace = false,
  others = [],
}: {
  star: StarProfile;
  backHref: string;
  workspace?: boolean;
  others?: StarProfile[];
}) {
  return (
    <div className={workspace ? "mf-workspace-detail" : "mf-page mf-detail-page"}>
      {workspace ? (
        <div className="mf-workspace-detail-topbar">
          <Link className="mf-back-link" href={backHref} aria-label="返回工作区">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>返回工作区</span>
          </Link>
          <span>合盘分析</span>
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
          <div className="mf-floating-note"><span>✦</span><strong>{star.matchCount}</strong><small>人已合盘</small></div>
        </section>

        <section className="mf-detail-copy">
          <span className="mf-kicker">{star.role}</span>
          <h1>{star.name}</h1>
          <p className="mf-detail-tagline">“{star.tagline}”</p>
          <p className="mf-profile-basis">出生日期 {star.birthDate}</p>
          <div className="mf-detail-description">
            <p>{star.description}</p>
          </div>
          {workspace ? (
            <ReportAwareEntry starId={star.id} />
          ) : (
            <AuthEntryLink className="mf-primary-button mf-detail-cta" href={`/home/relationship-test/${star.id}/test`}>
              查看他的正缘分析报告 <span>→</span>
            </AuthEntryLink>
          )}
          <p className="mf-detail-hint">输入出生日期、时间与城市，即可生成正缘分析报告</p>
          <p className="mf-bazi-note">分析基于吠陀占星（Jyotish），出生时间与城市用于确定上升星座；仅供文化娱乐参考。</p>
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
