"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StarListItem } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";

const PAGE_SIZE = 6;
const LIST_STATE_KEY = "myfate_star_list_v1";


export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ page: 1, query: "" });

  // 从明星详情返回时,恢复上次的页码/搜索词/滚动位置(会话内有效)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(LIST_STATE_KEY) ?? "null") as { p?: number; q?: string; y?: number } | null;
      if (saved?.q) setQuery(saved.q);
      if (saved?.p && saved.p > 1) setPage(saved.p);
      if (saved?.y) requestAnimationFrame(() => window.scrollTo(0, saved.y as number));
    } catch {
      // 忽略损坏的会话状态
    }
  }, []);

  // 页码/搜索变化即保存,供返回恢复
  useEffect(() => {
    stateRef.current = { page, query };
    try {
      sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ p: page, q: query, y: Math.round(window.scrollY) }));
    } catch {
      // 隐私模式下忽略
    }
  }, [page, query]);

  // 节流记录滚动位置
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ p: stateRef.current.page, q: stateRef.current.query, y: Math.round(window.scrollY) }));
        } catch {
          // 忽略
        }
      }, 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

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
      <header className="mf-bz-discover-head">
        <div>
          <span>CELEBRITY READING</span>
          <h1>读懂 TA 的天赋与人生节奏<i className="mf-bz-sparkle" aria-hidden="true">✦</i></h1>
          <p>从公开生辰信息出发，浏览人物档案，选择生辰画像或双人关系解读。</p>
        </div>
        <aside aria-label="已收录人数">
          <strong>{stars.length}</strong>
          <small>位明星档案</small>
        </aside>
      </header>
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
          <Link
            className="mf-bz-star-cover"
            href={`${basePath}/${star.id}`}
            key={star.id}
          >
            <PortraitImg
              src={star.portraitSrc}
              alt={`${star.name}的人物肖像`}
              priority={index < 2}
            />
            <div className="mf-bz-cover-overlay">
              <div className="mf-bz-cover-copy">
                <strong>{star.name}</strong>
                <span>{star.role}</span>
              </div>
              <span className="mf-bz-cover-go" aria-hidden="true">→</span>
            </div>
          </Link>
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
