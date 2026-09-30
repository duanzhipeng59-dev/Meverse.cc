"use client";

import { useMemo, useRef, useState } from "react";
import AuthEntryLink from "../../auth-entry-link";
import type { StarProfile } from "../../myfate-data";

const PAGE_SIZE = 12;

const TABS = [
  { id: "all", label: "全部" },
  { id: "singer", label: "歌手" },
  { id: "actor", label: "演员" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function matchesTab(star: StarProfile, tab: TabId) {
  if (tab === "all") return true;
  const keyword = tab === "singer" ? "歌手" : "演员";
  return (star.categories ?? []).includes(keyword) || star.role.includes(keyword);
}

export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarProfile[]; basePath?: string }) {
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return stars.filter((star) => {
      if (!matchesTab(star, tab)) return false;
      if (!keyword) return true;
      return star.name.toLowerCase().includes(keyword)
        || star.role.toLowerCase().includes(keyword)
        || star.mbti.toLowerCase().includes(keyword)
        || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword));
    });
  }, [stars, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStars = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goToPage(nextPage: number) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="mf-bz-discover">
      <header className="mf-bz-discover-head">
        <div>
          <span>DISCOVER</span>
          <h1>遇见让你心动的人</h1>
          <p>选择一位想了解的人，生成你与 TA 的吠陀合盘报告。</p>
        </div>
        <aside aria-hidden="true">
          <p>星光不问赶路人<br />星盘自有答案</p>
        </aside>
      </header>

      <div className="mf-bz-discover-toolbar">
        <div className="mf-bz-discover-tabs" role="tablist" aria-label="分类筛选">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "is-active" : undefined}
              onClick={() => { setTab(item.id); setPage(1); }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mf-bz-discover-search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="search"
            placeholder="搜索名字 / MBTI / 分组"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            aria-label="搜索明星"
          />
        </div>
      </div>

      <div className="mf-bz-discover-grid" ref={gridRef}>
        {pageStars.map((star) => (
          <AuthEntryLink
            className="mf-bz-star-card"
            href={`${basePath}/${star.id}`}
            anonymousNext={basePath}
            key={star.id}
          >
            <div className="mf-bz-star-portrait" style={{ backgroundImage: `url("${star.portraitSrc}")` }} role="img" aria-label={`${star.name}的人物肖像`} />
            <div className="mf-bz-star-info">
              <strong>{star.name}</strong>
              <span>{star.role}</span>
            </div>
            <div className="mf-bz-star-traits">
              {star.traits.slice(0, 3).map((trait) => <i key={trait}>{trait}</i>)}
            </div>
            <span className="mf-bz-star-cta">查看详情 <b aria-hidden="true">→</b></span>
          </AuthEntryLink>
        ))}
        {pageStars.length === 0 ? (
          <p className="mf-bz-discover-empty">没有找到符合条件的人，换个关键词试试。</p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <nav className="mf-bz-discover-pagination" aria-label="列表翻页">
          <button type="button" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
            <span aria-hidden="true">←</span> 上一页
          </button>
          <span>第 {currentPage} / {totalPages} 页 · 共 {filtered.length} 位</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
            下一页 <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}
