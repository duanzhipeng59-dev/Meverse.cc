import Link from "next/link";
import { getStarReportViews, type StarReportType, type StarReportView } from "../../myfate-stars-server";
import { getOptionalPageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";

const REPORT_LABELS: Record<StarReportType, string> = {
  bazi: "AI 生辰画像",
  astrology: "AI 星盘解读",
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "bazi", label: "生辰画像" },
  { id: "astrology", label: "星盘解读" },
] as const;

function entryAskText(askCount: number) {
  return askCount > 0 ? `已追问${askCount}次` : "暂无追问";
}

function relativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 1) return "昨天";
  if (diffDays < 30) return `${diffDays}天前`;
  return date.getFullYear() === now.getFullYear()
    ? date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

type StarGroup = {
  starId: string;
  name: string;
  role: string;
  portraitSrc: string;
  entries: Array<{ type: StarReportType; viewCount: number; askCount: number; lastViewedAt: string }>;
  latestAt: string;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const filter = type === "bazi" || type === "astrology" ? type : "all";
  const user = await getOptionalPageUser("/home/reports");
  const views = user ? await getStarReportViews(user.id) : [];

  // 按明星聚合;组内报告行按最近时间排序,组间按最新浏览排序
  const groups = new Map<string, StarGroup>();
  for (const view of views) {
    let group = groups.get(view.starId);
    if (!group) {
      group = { starId: view.starId, name: view.name, role: view.role, portraitSrc: view.portraitSrc, entries: [], latestAt: view.lastViewedAt };
      groups.set(view.starId, group);
    }
    group.entries.push({ type: view.reportType, viewCount: view.viewCount, askCount: view.askCount, lastViewedAt: view.lastViewedAt });
    if (view.lastViewedAt > group.latestAt) group.latestAt = view.lastViewedAt;
  }
  const allGroups = [...groups.values()]
    .map((group) => ({ ...group, entries: group.entries.sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt)) }))
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt));

  const visibleGroups = filter === "all"
    ? allGroups
    : allGroups
        .map((group) => ({ ...group, entries: group.entries.filter((entry) => entry.type === filter) }))
        .filter((group) => group.entries.length > 0);

  return (
    <div className="mf-hist">
      <header className="mf-hist-head">
        <div>
          <span className="mf-kicker">浏览记录</span>
          <h1>已解锁报告</h1>
          <p>自动记录你打开过的报告，按最近浏览排序。</p>
        </div>
        {visibleGroups.length ? (
          <div className="mf-hist-count"><strong>{visibleGroups.length}</strong><span>位明星</span></div>
        ) : null}
      </header>

      <nav className="mf-hist-tabs" aria-label="报告类型筛选">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/home/reports" : `/home/reports?type=${item.id}`}
            aria-current={filter === item.id ? "page" : undefined}
            className={filter === item.id ? "is-active" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {visibleGroups.length === 0 ? (
        <section className="mf-hist-empty">
          <span aria-hidden="true">✦</span>
          <h2>还没有浏览记录</h2>
          <p>去明星解读打开一份报告，它会自动出现在这里。</p>
        </section>
      ) : (
        <div className="mf-hist-grid">
          {visibleGroups.map((group) => (
            <article className="mf-hist-card" key={group.starId}>
              <Link className="mf-hist-card-head" href={`/home/relationship-test/${group.starId}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={group.portraitSrc} alt={`${group.name}的人物肖像`} loading="lazy" decoding="async" />
                <div>
                  <strong>{group.name}</strong>
                  <small>{group.role}</small>
                </div>
              </Link>
              {group.entries.map((entry) => (
                <Link
                  className="mf-hist-entry"
                  href={`/home/relationship-test/${group.starId}${entry.type === "astrology" ? "/astrology" : "/test"}`}
                  key={entry.type}
                >
                  <b>{REPORT_LABELS[entry.type]}</b>
                  <small>{relativeTime(entry.lastViewedAt)} · 看过 {entry.viewCount} 次 · {entryAskText(entry.askCount)}</small>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
