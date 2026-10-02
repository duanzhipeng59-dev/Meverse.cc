import Link from "next/link";
import { getStarReportViews } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";
import { getOptionalPageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";

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
          <p>去明星解读打开一份报告，它会自动出现在这里。</p>
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
