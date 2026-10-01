"use client";

import { useMemo, useRef, useState } from "react";
import AuthEntryLink from "../../auth-entry-link";
import type { StarProfile } from "../../myfate-data";
import { starGeneration } from "../../myfate-star-generations";

const PAGE_SIZE = 12;

const TABS = [
  { id: "all", label: "全部" },
  { id: "2", label: "二代" },
  { id: "3", label: "三代" },
  { id: "4", label: "四代" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function matchesTab(star: StarProfile, tab: TabId) {
  if (tab === "all") return true;
  return starGeneration(star.id) === tab;
}

export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarProfile[]; basePath?: string }) {
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<string[]>([]);
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

  function toggleFavorite(event: React.MouseEvent, starId: string) {
    event.preventDefault();
    event.stopPropagation();
    setFavorites(prev => prev.includes(starId) ? prev.filter(id => id !== starId) : [...prev, starId]);
  }

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
            placeholder="搜索你喜欢的明星..."
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            aria-label="搜索明星"
          />
        </div>
      </div>

      <div className="mf-bz-discover-grid" ref={gridRef}>
        {pageStars.map((star) => (
          <AuthEntryLink
            className="mf-bz-star-cover"
            href={`${basePath}/${star.id}`}
            anonymousNext={basePath}
            key={star.id}
          >
            <div className="mf-bz-cover-img" style={{ backgroundImage: `url("${star.portraitSrc}")` }} role="img" aria-label={`${star.name}的人物肖像`} />
            <button
              type="button"
              className={`mf-bz-cover-heart ${favorites.includes(star.id) ? "is-fav" : ""}`}
              aria-label={favorites.includes(star.id) ? `取消喜欢 ${star.name}` : `喜欢 ${star.name}`}
              onClick={(event) => toggleFavorite(event, star.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 9.1c0 4.7-8.5 9.4-8.5 9.4S3.5 13.8 3.5 9.1A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.4Z" /></svg>
            </button>
            <div className="mf-bz-cover-overlay">
              <div className="mf-bz-cover-copy">
                <strong>{star.name}</strong>
                <span>{star.role}</span>
              </div>
              <span className="mf-bz-cover-go" aria-hidden="true">→</span>
            </div>
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
