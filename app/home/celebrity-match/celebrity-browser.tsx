"use client";

import { useMemo, useRef, useState } from "react";
import AuthEntryLink from "../../auth-entry-link";
import type { StarListItem } from "../../myfate-stars-server";
import { PORTRAIT_SIZES, portraitImage, portraitSrcSet } from "../../myfate-image";

const PAGE_SIZE = 6;

const QUICK_FILTERS = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "male", label: "男艺人" },
  { id: "female", label: "女艺人" },
] as const;

const GENERATIONS = [
  { id: "all", label: "全部" },
  { id: "80", label: "80后" },
  { id: "90", label: "90后" },
  { id: "00", label: "00后" },
] as const;

type QuickFilterId = (typeof QUICK_FILTERS)[number]["id"];
type GenerationId = (typeof GENERATIONS)[number]["id"];

function matchesGeneration(star: StarListItem, generation: GenerationId) {
  if (generation === "all") return true;
  const year = Number(star.birthDate.slice(0, 4));
  if (generation === "80") return year >= 1980 && year <= 1989;
  if (generation === "90") return year >= 1990 && year <= 1999;
  return year >= 2000 && year <= 2009;
}

export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>("recommended");
  const [generation, setGeneration] = useState<GenerationId>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(stars.flatMap((star) => star.categories ?? []))).slice(0, 8),
    [stars],
  );
  const availableQuickFilters = useMemo(
    () => QUICK_FILTERS.filter((item) => (
      item.id !== "male" && item.id !== "female"
        ? true
        : stars.some((star) => star.gender === item.id)
    )),
    [stars],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const result = stars.filter((star) => {
      if (!matchesGeneration(star, generation)) return false;
      if (quickFilter === "male" && star.gender !== "male") return false;
      if (quickFilter === "female" && star.gender !== "female") return false;
      if (category !== "all" && !(star.categories ?? []).includes(category)) return false;
      if (!keyword) return true;
      return star.name.toLowerCase().includes(keyword)
        || star.role.toLowerCase().includes(keyword)
        || star.mbti.toLowerCase().includes(keyword)
        || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword));
    });

    if (quickFilter === "latest") {
      return [...result].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    }
    return result;
  }, [stars, generation, quickFilter, category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStars = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeAdvancedFilters = Number(generation !== "all") + Number(category !== "all");

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

        <div className="mf-bz-discover-toolbar">
          <div className="mf-bz-discover-tabs" role="tablist" aria-label="快捷筛选">
            {availableQuickFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={quickFilter === item.id}
                className={quickFilter === item.id ? "is-active" : undefined}
                onClick={() => { setQuickFilter(item.id); setPage(1); }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className={activeAdvancedFilters > 0 ? "mf-bz-filter-trigger is-active" : "mf-bz-filter-trigger"}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="celebrity-advanced-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            筛选{activeAdvancedFilters ? ` ${activeAdvancedFilters}` : ""}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <section className="mf-bz-advanced-filters" id="celebrity-advanced-filters" aria-label="更多筛选">
          <div className="mf-bz-filter-group">
            <span>出生年代</span>
            <div>
              {GENERATIONS.map((item) => (
                <button
                  className={generation === item.id ? "is-active" : undefined}
                  type="button"
                  key={item.id}
                  onClick={() => { setGeneration(item.id); setPage(1); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {categories.length > 0 ? (
            <div className="mf-bz-filter-group">
              <span>身份与组合</span>
              <div>
                <button className={category === "all" ? "is-active" : undefined} type="button" onClick={() => { setCategory("all"); setPage(1); }}>全部</button>
                {categories.map((item) => (
                  <button className={category === item ? "is-active" : undefined} type="button" key={item} onClick={() => { setCategory(item); setPage(1); }}>{item}</button>
                ))}
              </div>
            </div>
          ) : null}
          {activeAdvancedFilters > 0 ? (
            <button className="mf-bz-filter-reset" type="button" onClick={() => { setGeneration("all"); setCategory("all"); setPage(1); }}>清除筛选</button>
          ) : null}
        </section>
      ) : null}

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
