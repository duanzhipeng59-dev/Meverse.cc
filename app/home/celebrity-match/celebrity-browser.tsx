"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StarListItem } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";
import { SearchInput, FilterBar, Tag, EmptyState, SkeletonList } from "../../components/ui";

const PAGE_SIZE = 18;
// 返回列表后恢复搜索词/筛选/已加载页数/滚动位置(未登录本地存储;登录同步属后续批次)
const STATE_KEY = "mf_discover_v1";

const CATS = [
  { key: "all", label: "全部" },
  { key: "hybe", label: "HYBE" },
  { key: "jyp", label: "JYP" },
  { key: "sm", label: "SM" },
  { key: "yg", label: "YG" },
  { key: "cortis", label: "CORTIS" },
] as const;
type CatKey = (typeof CATS)[number]["key"];

const SORTS = [
  { key: "default", label: "综合" },
  { key: "hot", label: "热门" },
  { key: "new", label: "最新收录" },
  { key: "recent", label: "最近查看" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const AGENCY_KEYWORDS: Record<Exclude<CatKey, "all">, RegExp> = {
  hybe: /HYBE|BIGHIT|BIG HIT|PLEDIS|SOURCE|KOZ/i,
  jyp: /JYP/i,
  sm: /SM|S\.M\./i,
  yg: /YG/i,
  cortis: /CORTIS/i,
};

// "BTS 成员-金南俊" → 中文名"金南俊"
function personName(role: string) {
  const dashIndex = role.indexOf("-");
  return dashIndex > 0 ? role.slice(dashIndex + 1).trim() : "";
}

function groupOf(role: string) {
  const dashIndex = role.indexOf("-");
  return dashIndex > 0 ? role.slice(0, dashIndex).trim() : role;
}

function inCategory(star: StarListItem, key: CatKey) {
  if (key === "all") return true;
  const pattern = AGENCY_KEYWORDS[key];
  return (star.categories ?? []).some((c) => pattern.test(c)) || pattern.test(star.role);
}

// 最近查看(全站共享的轻量本地记录,发现页排序与首页「最近阅读」共用)
const RECENT_KEY = "mf_recent_stars_v1";
export function pushRecentStar(id: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const next = [id, ...list.filter((x) => x !== id)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* 隐私模式忽略 */ }
}
export function readRecentStars(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; } catch { return []; }
}

type PersistedState = { query: string; cat: CatKey; sort: SortKey; pages: number; scrollY: number };

// 人物发现页:常驻搜索 + 团体/维度筛选 + 无限滚动,返回恢复全部浏览状态。
export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const restored = useRef<PersistedState | null>(null);
  try {
    restored.current ??= JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as PersistedState | null;
  } catch { restored.current ??= null; }
  const initial = restored.current;

  const [cat, setCat] = useState<CatKey>(initial?.cat ?? "all");
  const [sort, setSort] = useState<SortKey>(initial?.sort ?? "default");
  const [query, setQuery] = useState(initial?.query ?? "");
  const [pages, setPages] = useState(Math.max(1, initial?.pages ?? 1));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const restoring = useRef(Boolean(initial?.scrollY));

  const filtered = useMemo(() => {
    let result = stars.filter((star) => inCategory(star, cat));
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      result = result.filter((star) => star.name.toLowerCase().includes(keyword)
        || star.nameEn.toLowerCase().includes(keyword)
        || star.role.toLowerCase().includes(keyword)
        || personName(star.role).toLowerCase().includes(keyword)
        || groupOf(star.role).toLowerCase().includes(keyword)
        || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword)));
    }
    if (sort === "hot") result = [...result].sort((a, b) => Number(b.homepageFeatured) - Number(a.homepageFeatured) || a.createdAt.localeCompare(b.createdAt));
    if (sort === "new") result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "recent") {
      const order = new Map(readRecentStars().map((id, index) => [id, index]));
      result = result.filter((star) => order.has(star.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return result;
  }, [stars, cat, sort, query]);

  const visibleCount = pages * PAGE_SIZE;
  const hasMore = filtered.length > visibleCount;

  // 筛选/搜索变化时回到第一页
  useEffect(() => { setPages(1); }, [cat, sort, query]);

  // 离开页面前持久化浏览状态
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ query, cat, sort, pages, scrollY: window.scrollY } satisfies PersistedState));
      } catch { /* 忽略 */ }
    };
    window.addEventListener("pagehide", save);
    return () => { window.removeEventListener("pagehide", save); save(); };
  }, [query, cat, sort, pages]);

  // 恢复滚动位置(仅返回场景一次)
  useEffect(() => {
    if (!restoring.current || !initial?.scrollY) return;
    restoring.current = false;
    requestAnimationFrame(() => { window.scrollTo({ top: initial.scrollY, behavior: "auto" }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 无限滚动:sentinel 进入视口自动加载下一页
  const loadMore = useCallback(() => { setPages((p) => p + 1); }, []);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="mf-explore">
      <div className="mf-explore-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索中文名 / 英文名 / 艺名 / 团体" />
        <FilterBar options={CATS as unknown as Array<{ key: CatKey; label: string }>} value={cat} onChange={setCat} ariaLabel="团体筛选" />
        <FilterBar options={SORTS as unknown as Array<{ key: SortKey; label: string }>} value={sort} onChange={setSort} ariaLabel="排序方式" />
      </div>

      {filtered.length === 0 ? (
        query || cat !== "all" || sort === "recent" ? (
          <EmptyState title="没有找到相关人物" hint={sort === "recent" ? "还没有浏览记录,先去看看人物吧" : "换个关键词或筛选条件试试"} />
        ) : (
          <SkeletonList rows={6} kind="portrait" />
        )
      ) : (
        <div className="mf-explore-grid">
          {filtered.slice(0, visibleCount).map((star) => {
            const complete = Boolean(star.birthDate && star.birthTime);
            return (
              <Link className="mf-bz-star-card" href={`${basePath}/${star.id}`} key={star.id} onClick={() => pushRecentStar(star.id)}>
                <span className="mf-bz-star-cover"><PortraitImg src={star.portraitSrc} alt={`${star.name}的人物肖像`} /></span>
                <b>{star.name}</b>
                <small>{groupOf(star.role)}</small>
                <div className="mf-explore-card-tags">
                  {star.mbti ? <Tag>{star.mbti}</Tag> : null}
                  <Tag tone={complete ? "good" : "warn"}>{complete ? "资料完整" : "资料待补充"}</Tag>
                </div>
                <span className="mf-explore-card-cta">查看画像 →</span>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="mf-explore-more">
          <button type="button" onClick={loadMore}>加载更多</button>
        </div>
      ) : filtered.length > 0 ? (
        <p className="mf-explore-end">已经全部加载（{filtered.length} 人）</p>
      ) : null}
    </div>
  );
}
