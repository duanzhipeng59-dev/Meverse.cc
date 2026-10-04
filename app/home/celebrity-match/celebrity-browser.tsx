"use client";

import Link from "next/link";

import { useMemo, useRef, useState } from "react";
import type { StarListItem } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";

const PAGE_SIZE = 6;

const CATS = [
  { key: "rec", label: "推荐" },
  { key: "singer", label: "歌手" },
  { key: "actor", label: "演员" },
  { key: "group", label: "组合" },
] as const;

type CatKey = (typeof CATS)[number]["key"];

// "BTS 成员-金南俊" → 中文名"金南俊"
function personName(role: string) {
  const dashIndex = role.indexOf("-");
  return dashIndex > 0 ? role.slice(dashIndex + 1).trim() : "";
}

function inCategory(star: StarListItem, key: CatKey) {
  if (key === "rec") return true;
  const cats = star.categories ?? [];
  if (key === "singer") return cats.some((c) => c.includes("歌手"));
  if (key === "actor") return cats.some((c) => c.includes("演员") || c.includes("戏剧"));
  return /成员/.test(star.role) || cats.some((c) => /组合|团体|BTS|SEVENTEEN|CORTIS/i.test(c));
}

// 人物探索:品牌标题 + 分类/搜索导航 + 人物画廊。搜索是导航的一部分,默认收起。
export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const [cat, setCat] = useState<CatKey>("rec");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let result = stars.filter((star) => inCategory(star, cat));
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      result = result.filter((star) => star.name.toLowerCase().includes(keyword)
        || star.role.toLowerCase().includes(keyword)
        || personName(star.role).toLowerCase().includes(keyword)
        || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword)));
    }
    return result;
  }, [stars, cat, query]);

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

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setPage(1);
  }

  return (
    <div className="mf-explore">
      <header className="mf-explore-head">
        <h1>读懂 TA 的人生<span className="is-accent">节奏</span></h1>
        <p>从生辰，看见一个人。</p>
      </header>

      <header className="mf-explore-head">
        <h1>读懂 TA 的人生<span className="is-accent">节奏</span></h1>
        <p>从生辰，看见一个人。</p>
      </header>

      <div className="mf-explore-nav">
        {!searchOpen ? (
          <>
            <nav className="mf-explore-tabs" aria-label="人物分类">
              {CATS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cat === item.key ? "is-active" : undefined}
                  aria-pressed={cat === item.key}
                  onClick={() => { setCat(item.key); setPage(1); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button className="mf-explore-searchopen" type="button" aria-label="搜索人物" onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" />
              </svg>
            </button>
          </>
        ) : (
          <div className="mf-explore-searchrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              autoFocus
              type="search"
              placeholder="搜索你想了解的人"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              aria-label="搜索你想了解的人"
            />
            <button type="button" aria-label="关闭搜索" onClick={closeSearch}>×</button>
          </div>
        )}
      </div>

      <div className="mf-explore-grid" ref={gridRef} key={`${cat}-${query}`}>
        {pageStars.map((star, index) => (
          <Link className="mf-explore-card" href={`${basePath}/${star.id}`} key={star.id}>
            <PortraitImg
              src={star.portraitSrc}
              alt={`${star.name}的人物肖像`}
              priority={index < 2}
            />
            <div className="mf-explore-copy">
              <b>{star.name}</b>
              {personName(star.role) ? <span>{personName(star.role)}</span> : null}
            </div>
          </Link>
        ))}
        {pageStars.length === 0 ? (
          <p className="mf-explore-empty">{query ? "没有找到相关的人物。" : "这个分类下还没有人物。"}</p>
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
