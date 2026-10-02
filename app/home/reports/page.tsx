import Link from "next/link";
import { getStarReportViews } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";
import { getOptionalPageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";

function relativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 1) return "昨天";
  if (diffDays < 30) return `${diffDays}天前`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear
    ? date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ReportsPage() {
  const user = await getOptionalPageUser("/home/reports");
  const views = user ? await getStarReportViews(user.id) : [];

  return (
    <div className="mf-hist">
      <header className="mf-hist-head">
        <div>
          <span className="mf-kicker">浏览记录</span>
          <h1>已解锁报告</h1>
          <p>自动记录你打开过的明星 AI 生辰画像，按最近浏览排序。</p>
        </div>
        {views.length ? (
          <div className="mf-hist-count"><strong>{views.length}</strong><span>位明星</span></div>
        ) : null}
      </header>

      {views.length === 0 ? (
        <section className="mf-hist-empty">
          <span aria-hidden="true">✦</span>
          <h2>还没有浏览记录</h2>
          <p>去明星解读打开一份 AI 生辰画像，它会自动出现在这里。</p>
          <Link className="mf-bz-btn" href="/home/relationship-test">去明星解读 <span aria-hidden="true">→</span></Link>
        </section>
      ) : (
        <div className="mf-hist-grid">
          {views.map((view) => (
            <Link className="mf-bz-star-cover" href={`/home/relationship-test/${view.starId}/test`} key={view.starId}>
              <PortraitImg src={view.portraitSrc} alt={`${view.name}的人物肖像`} />
              <div className="mf-bz-cover-overlay">
                <div className="mf-bz-cover-copy">
                  <strong>{view.name}</strong>
                  <span>{view.role}</span>
                  <small className="mf-hist-meta">{relativeTime(view.lastViewedAt)} · 看过 {view.viewCount} 次</small>
                </div>
                <span className="mf-bz-cover-go" aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
