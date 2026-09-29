import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import AuthEntryLink from "./auth-entry-link";
import ReportAwareEntry from "./home/celebrity-match/report-aware-entry";

export default function CelebrityDetail({
  star,
  backHref,
  workspace = false,
}: {
  star: StarProfile;
  backHref: string;
  workspace?: boolean;
}) {
  return (
    <div className={workspace ? "mf-workspace-detail" : "mf-page mf-detail-page"}>
      {workspace ? (
        <div className="mf-workspace-detail-topbar">
          <Link className="mf-back-link" href={backHref} aria-label="返回工作区">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>返回工作区</span>
          </Link>
          <span>三柱合盘</span>
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
          <div className="mf-floating-note"><span>✦</span><strong>{star.matchCount}</strong><small>人已测试</small></div>
        </section>

        <section className="mf-detail-copy">
          <span className="mf-kicker">{star.role}</span>
          <h1>{star.name}</h1>
          <p className="mf-detail-tagline">“{star.tagline}”</p>
          <p className="mf-profile-basis">
            三柱 {star.threePillars}
          </p>
          <div className="mf-detail-traits">{star.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
          <div className="mf-detail-description">
            <h2>TA 的情感人格</h2>
            <p>{star.description}</p>
            <dl>
              <div><dt>关系模式</dt><dd>{star.relationshipStyle}</dd></div>
              <div><dt>看重的事</dt><dd>{star.focus}</dd></div>
            </dl>
          </div>
          {workspace ? (
            <ReportAwareEntry starId={star.id} />
          ) : (
            <AuthEntryLink className="mf-primary-button mf-detail-cta" href={`/home/relationship-test/${star.id}/test`}>
              查看你与 TA 的合盘分析 <span>→</span>
            </AuthEntryLink>
          )}
          <p className="mf-detail-hint">输入出生日期即可直接查看三柱合盘分析</p>
          <p className="mf-bazi-note">三柱仅作为传统文化层面的辅助观察；缺少出生时辰，不构成完整八字排盘。</p>
        </section>
      </div>
    </div>
  );
}
