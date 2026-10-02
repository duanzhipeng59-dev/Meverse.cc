"use client";

import { useMemo, useRef, useState } from "react";
import AuthEntryLink from "../../auth-entry-link";
import type { StarListItem } from "../../myfate-stars-server";
import { PORTRAIT_SIZES, portraitImage, portraitSrcSet } from "../../myfate-image";

const PAGE_SIZE = 6;


export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return stars;
    return stars.filter((star) => star.name.toLowerCase().includes(keyword)
      || star.role.toLowerCase().includes(keyword)
      || star.mbti.toLowerCase().includes(keyword)
      || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword)));
  }, [stars, query]);

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
      <div className="mf-bz-discover-tools">
        <label className="mf-bz-discover-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.6" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            placeholder="搜索明星或组合"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            aria-label="搜索明星或组合"
          />
        </label>

      </div>

      <div className="mf-bz-discover-summary" aria-live="polite">
        <span>共 {filtered.length} 位</span>
        {query ? <button type="button" onClick={() => setQuery("")}>清除搜索</button> : null}
      </div>

      <div className="mf-bz-discover-grid" ref={gridRef}>
        {pageStars.map((star, index) => (
          <AuthEntryLink
            className="mf-bz-star-cover"
            href={`${basePath}/${star.id}`}
            anonymousNext={basePath}
            key={star.id}
          >
            <img
              className="mf-bz-cover-img"
              src={portraitImage(star.portraitSrc, 360)}
              srcSet={portraitSrcSet(star.portraitSrc)}
              sizes={PORTRAIT_SIZES}
              alt={`${star.name}的人物肖像`}
              width={360}
              height={468}
              loading={index < 2 ? "eager" : "lazy"}
              fetchPriority={index < 2 ? "high" : "auto"}
              decoding="async"
              onError={(event) => {
                const img = event.currentTarget;
                if (img.dataset.fallback) return;
                img.dataset.fallback = "1";
                img.srcset = "";
                img.src = "/historical-figure.svg";
              }}
            />
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
          <p className="mf-bz-discover-empty">没有找到符合条件的人，换个筛选条件试试。</p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <nav className="mf-bz-discover-pagination" aria-label="列表翻页">
          <button type="button" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
            <span aria-hidden="true">←</span> 上一页
          </button>
          <span>第 {currentPage} / {totalPages} 页</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
            下一页 <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}
