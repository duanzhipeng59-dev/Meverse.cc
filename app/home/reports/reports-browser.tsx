"use client";

import Link from "next/link";
import { portraitImage } from "../../myfate-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_COPY,
  FILTERS,
  REPORT_LABELS,
  aggregateGroups,
  entryAskText,
  filterGroups,
  relativeTime,
  type ReportFilter,
  type StarGroup,
} from "./aggregate";
import type { StarReportView } from "../../myfate-stars-server";
import type { DualReportRow } from "../../myfate-dual-server";

const STATE_KEY = "myfate_reports_state_v1";

type Phase = "ready" | "refreshing" | "error";

// 浏览记录筛选:三类记录来自同一份"全部"数据,筛选纯前端完成——
// 点击即时切换选中态与内容,无网络等待;数据刷新单独走 API 且过期结果不落地。
export default function ReportsBrowser({ initialGroups, dualReports, urlFilter }: { initialGroups: StarGroup[]; dualReports: DualReportRow[]; urlFilter: ReportFilter | null }) {
  const [dualList, setDualList] = useState(dualReports);
  const [groups, setGroups] = useState(initialGroups);
  const [filter, setFilter] = useState<ReportFilter>(urlFilter ?? "all");
  const [phase, setPhase] = useState<Phase>("ready");
  const reqId = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // 返回本页时恢复上次筛选与滚动位置(分类以 URL 参数优先,滚动位置始终恢复)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as { f?: ReportFilter; y?: number } | null;
      if (!urlFilter && saved?.f) setFilter(saved.f);
      if (saved?.y) requestAnimationFrame(() => window.scrollTo(0, saved.y as number));
    } catch {
      // 忽略损坏的会话状态
    }
  }, [urlFilter]);

  const rememberState = useCallback((next: ReportFilter) => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ f: next, y: Math.round(window.scrollY) }));
    } catch {
      // 隐私模式下忽略
    }
  }, []);

  // 节流记录滚动位置,供返回恢复
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => rememberState(filterRef.current), 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [rememberState]);

  function selectFilter(next: ReportFilter) {
    if (next === filter) return; // 重复点击:不重复请求、不清空、不动滚动
    setFilter(next);
    rememberState(next);
    // 静默同步 URL,分享/刷新时仍能回到当前分类
    window.history.replaceState(null, "", next === "all" ? "/home/reports" : `/home/reports?type=${next}`);
  }

  const refresh = useCallback(async () => {
    const id = ++reqId.current;
    setPhase("refreshing");
    try {
      const response = await fetch("/api/myfate/star-report-views", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP_" + response.status);
      const data = await response.json() as { views?: StarReportView[] };
      if (id !== reqId.current) return; // 过期响应丢弃
      setGroups(aggregateGroups(data.views ?? []));
      setPhase("ready");
    } catch {
      if (id !== reqId.current) return;
      setPhase("error");
    }
  }, []);

  const visibleGroups = filterGroups(groups, filter);
  const empty = EMPTY_COPY[filter];

  return (
    <div className="mf-hist">
      <header className="mf-hist-head">
        <div>
          <span className="mf-kicker">浏览记录</span>
          <h1>已解锁报告</h1>
          <p>自动记录你打开过的报告，按最近浏览排序。</p>
        </div>
      </header>

      <nav className="mf-hist-tabs" aria-label="报告类型筛选">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "is-active" : undefined}
            aria-pressed={filter === item.id}
            onClick={() => selectFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mf-hist-body" aria-busy={phase === "refreshing"} aria-live="polite">
        {phase === "error" && groups.length === 0 ? (
          <section className="mf-hist-empty" role="alert">
            <span aria-hidden="true">✦</span>
            <h2>加载失败，请重试</h2>
            <p>内容没能加载出来，你的筛选选择已保留。</p>
            <button className="mf-hist-retry" type="button" onClick={refresh}>重新加载</button>
          </section>
        ) : (filter === "dual" ? dualList.length === 0 : visibleGroups.length === 0 && (filter !== "all" || dualList.length === 0)) ? (
          <section className="mf-hist-empty">
            <span aria-hidden="true">✦</span>
            <h2>{empty.title}</h2>
            <p>{empty.hint}</p>
            <button className="mf-hist-retry" type="button" onClick={refresh} disabled={phase === "refreshing"}>
              {phase === "refreshing" ? "正在加载…" : "重新加载"}
            </button>
          </section>
        ) : (
          <div className="mf-hist-grid mf-hist-fade" key={filter}>
            {visibleGroups.map((group) => (
              <article className="mf-hist-card" key={group.starId}>
                <Link className="mf-hist-card-head" href={`/home/relationship-test/${group.starId}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portraitImage(group.portraitSrc, 120)} alt={`${group.name}的人物肖像`} loading="lazy" decoding="async" />
                  <div>
                    <strong>{group.name}</strong>
                    <small>{group.role}</small>
                  </div>
                </Link>
                {group.entries.map((entry) => (
                  <Link
                    className="mf-hist-entry"
                    href={`/home/relationship-test/${group.starId}/test?from=reports`}
                    key={entry.type}
                  >
                    <b>{REPORT_LABELS[entry.type]}</b>
                    <small>{relativeTime(entry.lastViewedAt)} · 看过 {entry.viewCount} 次 · {entryAskText(entry.askCount)}</small>
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </article>
            ))}
            {(filter === "all" || filter === "dual") && dualList.length ? dualList.map((report) => (
              <article className="mf-hist-card mf-hist-card-dual" key={report.id}>
                <Link className="mf-hist-card-head" href={`/home/dual-star-match/reports/${report.id}`}>
                  <span className="mf-hist-dual-avatars">
                    <img src={report.portraitA ?? ""} alt="" loading="lazy" decoding="async" aria-hidden="true" />
                    <i aria-hidden="true">×</i>
                    <img src={report.portraitB ?? ""} alt="" loading="lazy" decoding="async" aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{report.nameA} × {report.nameB}</strong>
                    <small>双人合盘</small>
                  </div>
                </Link>
                <Link className="mf-hist-entry" href={`/home/dual-star-match/reports/${report.id}`}>
                  <b>双人合盘报告</b>
                  <small>{relativeTime(report.createdAt)} · {report.status === "ready" ? "已生成" : report.status === "failed" ? "生成失败" : "生成中"}</small>
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            )) : null}
          </div>
        )}
        {phase === "error" && groups.length > 0 ? (
          <div className="mf-hist-stale" role="status">
            <span>刷新失败，正在显示上次的内容</span>
            <button type="button" onClick={refresh}>重试</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
