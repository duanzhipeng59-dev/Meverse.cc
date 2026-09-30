import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import AuthEntryLink from "./auth-entry-link";
import ReportAwareEntry from "./home/celebrity-match/report-aware-entry";

function formatBirthDate(value: string) {
  return value.replaceAll("-", ".");
}

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
          <p className="mf-detail-born">BORN · {formatBirthDate(star.birthDate)}</p>
        </section>
      </div>

      <section className="mf-detail-cta-band">
        <div className="mf-detail-cta-copy">
          <h2>你 × {star.name}</h2>
          <p>从沟通 · 情绪支持 · 亲密边界 · 共同成长，看看你们会形成怎样的关系。</p>
        </div>
        {workspace ? (
          <ReportAwareEntry starId={star.id} />
        ) : (
          <AuthEntryLink className="mf-primary-button mf-detail-cta" href={`/home/relationship-test/${star.id}/test`}>
            查看你与 {star.name} 的合盘 <span>→</span>
          </AuthEntryLink>
        )}
      </section>

      <section className="mf-detail-bio">
        <p>{star.description}</p>
        <p className="mf-detail-bio-note">内容以公开身份信息与测试情境为基础，不推断艺人的真实私生活，也不把性格类型视为固定结论。</p>
      </section>
    </div>
  );
}
