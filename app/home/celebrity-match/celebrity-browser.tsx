"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dayMasterOf, type StarListItem } from "../../myfate-stars-server";
import PortraitImg from "../../portrait-img";
import { Tag, EmptyState, SkeletonList } from "../../components/ui";

const PAGE_SIZE = 18;
// 返回列表后恢复搜索词/筛选/已加载页数/滚动位置(未登录本地存储;登录同步属后续批次)
const STATE_KEY = "mf_discover_v1";

const SORTS = [
  { key: "default", label: "全部" },
  { key: "hot", label: "热门" },
  { key: "new", label: "最新收录" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

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

// 人物发现页:排序标签 + 搜索icon(点击icon展开搜索框,取消收起) + 无限滚动,返回恢复全部浏览状态。
export default function CelebrityBrowser({ stars, basePath = "/home/relationship-test" }: { stars: StarListItem[]; basePath?: string }) {
  const restored = useRef<PersistedState | null>(null);
  try {
    restored.current ??= JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as PersistedState | null;
  } catch { restored.current ??= null; }
  const initial = restored.current;

  const urlQuery = useSearchParams().get("q") ?? "";
  const savedSort = SORTS.find((item) => item.key === initial?.sort)?.key;
  const [sort, setSort] = useState<SortKey>(savedSort ?? "default");
  const [query, setQuery] = useState(initial?.query || urlQuery);
  const [searchOpen, setSearchOpen] = useState(Boolean(initial?.query || urlQuery));
  const [pages, setPages] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 返回标记:最近浏览的人物卡显示玫红描边(从预览页返回时,红框落在刚看过的那张卡上)
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);
  useEffect(() => { setLastVisitedId(readRecentStars()[0] ?? null); }, []);

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
    if (sort === "hot") result = [...result].sort((a, b) => Number(b.homepageFeatured) - Number(a.homepageFeatured) || a.createdAt.localeCompare(b.createdAt));
    if (sort === "new") result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [stars, sort, query]);

  const visibleCount = pages * PAGE_SIZE;
  const hasMore = filtered.length > visibleCount;

  // 排序/搜索变化时回到第一页(挂载首轮跳过,避免清掉恢复的页数)
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPages(1);
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

  // 返回恢复 · 第一步(绘制前):layout effect 里补页数会同步触发重渲染,重渲染的 layout effect
  // 再落位滚动——两步都发生在浏览器首次绘制之前,用户直接看到目标位置,无"先顶部再滚动"的闪跳
  useLayoutEffect(() => {
    if (initial?.pages && initial.pages > 1) setPages(initial.pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (!initial?.scrollY) return;
    window.scrollTo({ top: initial.scrollY, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // 返回恢复 · 第二步(绘制后兜底):框架层的滚动重置触发时机不定(可迟至数百毫秒),
  // 校准窗口放宽到 6 秒、连续 6 次稳定才收手;用户一旦主动滚动立即让位;
  // 同时挂起浏览器自身的 scrollRestoration,消除对抗源
  useEffect(() => {
    if (!initial?.scrollY) return;
    const target = initial.scrollY;
    scrollYRef.current = target;
    const prevRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    let landed = 0;
    let ticks = 0;
    let userTouched = false;
    let timer = 0;
    const onUser = () => { userTouched = true; };
    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("keydown", onUser);
      history.scrollRestoration = prevRestoration;
    };
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("keydown", onUser);
    const settle = () => {
      if (userTouched) {
        scrollYRef.current = window.scrollY; // 用户接管,当前位置成为新的保存真相
        finish();
        return;
      }
      if (Math.abs(window.scrollY - target) <= 4) {
        scrollYRef.current = target;
        if (++landed >= 6) { finish(); return; }
      } else {
        landed = 0;
        window.scrollTo({ top: target, behavior: "instant" });
      }
      if (++ticks > 50) { finish(); return; } // 6 秒兜底退出
      timer = window.setTimeout(settle, 120);
    };
    settle();
    return finish;
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
          {filtered.slice(0, visibleCount).map((star) => {
            const complete = Boolean(star.birthDate && star.birthTime);
            const dayMaster = dayMasterOf(star.threePillars);
            return (
              <Link
                className={star.id === lastVisitedId ? "mf-bz-star-card is-visited" : "mf-bz-star-card"}
                href={`${basePath}/${star.id}`}
                key={star.id}
                onClick={() => pushRecentStar(star.id)}
              >
                <span className="mf-bz-star-cover"><PortraitImg src={star.portraitSrc} alt={`${star.name}的人物肖像`} /></span>
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
