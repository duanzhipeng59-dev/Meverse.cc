"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StarListItem } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";
import { Tag, EmptyState, SkeletonList } from "../../components/ui";

const PAGE_SIZE = 12;
// 返回列表后恢复搜索词/排序/已加载页数/滚动位置(未登录本地存储;登录同步属后续批次)
const STATE_KEY = "mf_discover_v1";

const SORTS = [
  { key: "default", label: "全部" },
  { key: "hot", label: "热门" },
  { key: "new", label: "最新收录" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

// 热门 tab 的高知名度组合池(角色前缀命中即入池;新团不入,保证置顶的都是大牌)
const POPULAR_GROUPS = ["BTS", "SEVENTEEN", "TOMORROW X TOGETHER", "Stray Kids", "2PM", "H.O.T.", "BIGBANG", "WINNER", "iKON", "BLACKPINK"];

// 保持浏览器组件只依赖纯前端代码，避免把 Supabase/Node async_hooks 打进客户端。
const GAN_ELEMENT: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
function dayMasterOf(threePillars?: string): string {
  const last = (threePillars ?? "").split("·").map((part) => part.trim()).filter(Boolean).pop() ?? "";
  const stem = last[0];
  return stem && GAN_ELEMENT[stem] ? stem + GAN_ELEMENT[stem] : "";
}

// 热门人物需要固定但分散的顺序；不能在 SSR/浏览器首屏使用 Math.random()。
function stableRank(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// "BTS 成员-金南俊" → 中文名"金南俊"
function personName(role: string) {
  const dashIndex = role.indexOf("-");
  return dashIndex > 0 ? role.slice(dashIndex + 1).trim() : "";
}

function groupOf(role: string) {
  const dashIndex = role.indexOf("-");
  return dashIndex > 0 ? role.slice(0, dashIndex).trim() : role;
}

// 最近查看(全站共享的轻量本地记录,「我的」页最近阅读与报告页写入共用)
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

type PersistedState = { query: string; sort: SortKey; pages: number; scrollY: number };

// sessionStorage 只在客户端状态初始化函数中读取:SSR 返回 null,损坏时清除存储并回退默认状态
function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as Partial<PersistedState> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      sort: SORTS.some((item) => item.key === parsed.sort) ? (parsed.sort as SortKey) : "default",
      pages: Number.isFinite(parsed.pages) && (parsed.pages as number) > 0 ? Math.floor(parsed.pages as number) : 1,
      scrollY: Number.isFinite(parsed.scrollY) && (parsed.scrollY as number) > 0 ? (parsed.scrollY as number) : 0,
    };
  } catch {
    try { sessionStorage.removeItem(STATE_KEY); } catch { /* 忽略 */ }
    return null;
  }
}

// 人物发现页:排序标签 + 搜索icon(点击icon展开搜索框,取消收起) + 无限滚动,返回恢复全部浏览状态。
export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const urlQuery = useSearchParams().get("q") ?? "";
  const [initial, setInitial] = useState<PersistedState | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [query, setQuery] = useState(urlQuery);
  const [searchOpen, setSearchOpen] = useState(Boolean(urlQuery));
  const [pages, setPages] = useState(1);
  const restoringRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 返回标记:最近浏览的人物卡显示玫红描边(从预览页返回时,红框落在刚看过的那张卡上)
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);
  useEffect(() => { setLastVisitedId(readRecentStars()[0] ?? null); }, []);

  useEffect(() => {
    const restored = readPersisted();
    if (!restored) return;
    restoringRef.current = true;
    setInitial(restored);
    setSort(restored.sort);
    setQuery(restored.query || urlQuery);
    setSearchOpen(Boolean(restored.query || urlQuery));
    setPages(restored.pages);
  }, [urlQuery]);

  // 热门置顶池:高知名度偶像固定散列排序取前 8 个，确保 SSR 与客户端首屏完全一致。
  const popularTop = useMemo(() => {
    const pool = stars.filter((star) => star.homepageFeatured
      || POPULAR_GROUPS.some((group) => star.role.toLowerCase().includes(group.toLowerCase())));
    return [...pool].sort((a, b) => stableRank(a.id) - stableRank(b.id)).slice(0, 8);
  }, [stars]);

  const filtered = useMemo(() => {
    let result = stars;
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      result = result.filter((star) => star.name.toLowerCase().includes(keyword)
        || star.nameEn.toLowerCase().includes(keyword)
        || star.role.toLowerCase().includes(keyword)
        || personName(star.role).toLowerCase().includes(keyword)
        || groupOf(star.role).toLowerCase().includes(keyword)
        || (star.categories ?? []).some((item) => item.toLowerCase().includes(keyword)));
    }
    if (sort === "hot") {
      const rank = new Map(popularTop.map((star, index) => [star.id, index]));
      result = [...result].sort((a, b) => {
        const pa = rank.get(a.id);
        const pb = rank.get(b.id);
        if (pa !== undefined && pb !== undefined) return pa - pb;
        if (pa !== undefined) return -1;
        if (pb !== undefined) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    if (sort === "new") result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [stars, sort, query, popularTop]);

  const visibleCount = pages * PAGE_SIZE;
  const hasMore = filtered.length > visibleCount;

  // 排序/搜索变化时回到第一页(挂载首轮跳过,避免清掉恢复的页数);切换排序另滚回顶部
  const skipFirst = useRef(true);
  const prevSort = useRef(sort);
  useEffect(() => {
    if (restoringRef.current) { restoringRef.current = false; return; }
    if (skipFirst.current) { skipFirst.current = false; prevSort.current = sort; return; }
    setPages(1);
    if (prevSort.current !== sort) {
      prevSort.current = sort;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [sort, query]);

  // 实时镜像当前浏览状态:保存时永远读最新值,避免 cleanup 闭包里的过期快照
  const stateRef = useRef({ query, sort, pages });
  stateRef.current = { query, sort, pages };
  // 只记录用户主动滚动的位置:路由/浏览器的程序性滚动重置(返回时的异步 scrollTo)一律不记,
  // 否则二次挂载时会恢复到被污染的位置
  const scrollYRef = useRef(0);

  const save = useCallback(() => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...stateRef.current, scrollY: scrollYRef.current } satisfies PersistedState));
    } catch { /* 忽略 */ }
  }, []);

  useEffect(() => {
    let fromUser = false;
    let touchTimer = 0;
    const markUser = () => { fromUser = true; };
    const capture = () => { if (fromUser) { scrollYRef.current = window.scrollY; fromUser = false; } };
    const onTouchEnd = () => {
      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => { scrollYRef.current = window.scrollY; }, 180); // 惯性滚动结束后取最终位置
    };
    window.addEventListener("wheel", markUser, { passive: true });
    window.addEventListener("touchmove", markUser, { passive: true });
    window.addEventListener("keydown", markUser);
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("scroll", capture, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchmove", markUser);
      window.removeEventListener("keydown", markUser);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("scroll", capture);
      window.removeEventListener("pagehide", save);
      window.clearTimeout(touchTimer);
      save();
    };
  }, [save]);

  // 恢复·绘制前:补页数后同步重渲染,重渲染的 layout effect 瞬时落位——首帧即目标位置;
  // 并挂起浏览器自身滚动恢复,避免水合前停在历史中间位置
  useLayoutEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = prev; };
  }, []);
  useLayoutEffect(() => {
    if (!initial?.scrollY) return;
    window.scrollTo({ top: initial.scrollY, behavior: "instant" });
  }, [initial, pages]);

  // 恢复·校准:rAF 首次落位后,若偏差超过 4px,每 120ms 校准一次,最多两次;不做无限定时循环
  useEffect(() => {
    if (!initial?.scrollY) return;
    const target = initial.scrollY;
    scrollYRef.current = target;
    let calibrations = 0;
    let timer = 0;
    const calibrate = () => {
      if (Math.abs(window.scrollY - target) > 4 && calibrations < 2) {
        calibrations += 1;
        window.scrollTo({ top: target, behavior: "instant" });
        timer = window.setTimeout(calibrate, 120);
      }
    };
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: "instant" });
      timer = window.setTimeout(calibrate, 120);
    });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // 无限滚动:sentinel 距视口底部 400px 时加载下一批;触发即断开,由 pages 变化重建,单次只加一页
  const loadMore = useCallback(() => { setPages((p) => p + 1); }, []);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        observer.disconnect();
        loadMore();
      }
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, pages]);

  return (
    <div className="mf-explore">
      <div className="mf-explore-ctrl">
        {searchOpen ? (
          <>
            <label className="mf-explore-searchbox">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索本地结果"
                aria-label="搜索人物"
                enterKeyHint="search"
                autoFocus
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
            </label>
            <button
              type="button"
              className="mf-explore-cancel"
              onClick={() => { setSearchOpen(false); setQuery(""); }}
            >
              取消
            </button>
          </>
        ) : (
          <>
            <nav className="mf-explore-tabs" aria-label="排序方式">
              {SORTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={sort === item.key ? "is-active" : undefined}
                  aria-pressed={sort === item.key}
                  onClick={() => setSort(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button type="button" className="mf-explore-searchbtn" aria-label="搜索" onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
            </button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        query ? (
          <EmptyState title="没有找到相关人物" hint="换个关键词试试" />
        ) : (
          <SkeletonList rows={6} kind="portrait" />
        )
      ) : (
        <div className="mf-explore-grid">
          {filtered.slice(0, visibleCount).map((star, index) => {
            const complete = Boolean(star.birthDate && star.birthTime);
            const dayMaster = dayMasterOf(star.threePillars);
            return (
              <Link
                className={star.id === lastVisitedId ? "mf-bz-star-card is-visited" : "mf-bz-star-card"}
                href={`${basePath}/${star.id}`}
                key={star.id}
                onClick={() => pushRecentStar(star.id)}
              >
                <span className="mf-bz-star-cover"><PortraitImg src={star.portraitSrc} alt={`${star.name}的人物肖像`} priority={index < 4} /></span>
                <b>{star.name}</b>
                <small>{star.nameEn ? `${groupOf(star.role)}-${star.nameEn}` : groupOf(star.role)}</small>
                <div className="mf-explore-card-tags">
                  {dayMaster ? <Tag>{dayMaster}</Tag> : null}
                  <Tag tone={complete ? "good" : "warn"}>{complete ? "资料完整" : "资料待补充"}</Tag>
                </div>
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
