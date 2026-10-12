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
import { ConfirmDialog, FilterBar, SearchInput, Tag } from "../../components/ui";

const STATE_KEY = "myfate_reports_state_v1";

type Phase = "ready" | "refreshing" | "error";

// 浏览记录筛选:三类记录来自同一份"全部"数据,筛选纯前端完成——
// 点击即时切换选中态与内容,无网络等待;数据刷新单独走 API 且过期结果不落地。
export default function ReportsBrowser({ initialGroups, dualReports, urlFilter }: { initialGroups: StarGroup[]; dualReports: DualReportRow[]; urlFilter: ReportFilter | null }) {
  const [dualList, setDualList] = useState(dualReports);
  const [groups, setGroups] = useState(initialGroups);
  const [filter, setFilter] = useState<ReportFilter>(urlFilter ?? "all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "generating" | "completed" | "failed">("all");
  const [pendingDelete, setPendingDelete] = useState<{ kind: "dual" | "single"; id: string; name: string } | null>(null);
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (target.kind === "dual") {
      await fetch("/api/dual-star/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: target.id }) }).catch(() => undefined);
      setDualList((prev) => prev.filter((item) => item.id !== target.id));
    } else {
      await fetch("/api/myfate/star-report-views", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starId: target.id }) }).catch(() => undefined);
      setGroups((prev) => prev.filter((group) => group.starId !== target.id));
    }
  }

  async function retryDual(reportId: string) {
    setDualList((prev) => prev.map((item) => (item.id === reportId ? { ...item, status: "generating" as const } : item)));
    await fetch(`/api/dual-star/${reportId}`, { method: "POST" }).catch(() => undefined);
    setTimeout(() => { window.location.reload(); }, 700);
  }

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

  const keyword = query.trim().toLowerCase();
  const searchedGroups = keyword
    ? groups.filter((group) => group.name.toLowerCase().includes(keyword) || group.role.toLowerCase().includes(keyword))
    : groups;
  const statusMatch = (status: string) => statusFilter === "all"
    || (statusFilter === "completed" && status === "ready")
    || (statusFilter === "failed" && status === "failed")
    || (statusFilter === "generating" && status === "generating");
  const searchedDual = dualList.filter((report) => (!keyword
    || report.nameA.toLowerCase().includes(keyword) || report.nameB.toLowerCase().includes(keyword))
    && statusMatch(report.status));
  const visibleGroups = filterGroups(searchedGroups, filter);
  const visibleDual = searchedDual;
  const empty = EMPTY_COPY[filter];

  return (
    <div className="mf-hist">
      <header className="mf-hist-head">
        <div>
          <h1>报告</h1>
          <p>自动保存你查看和生成的报告。</p>
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

      <div className="mf-lib-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="按名称搜索报告" />
        <FilterBar
          ariaLabel="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: "all", label: "全部状态" },
            { key: "completed", label: "已完成" },
            { key: "generating", label: "生成中" },
            { key: "failed", label: "生成失败" },
          ]}
        />
      </div>

      <div className="mf-hist-body" aria-busy={phase === "refreshing"} aria-live="polite">
        {phase === "error" && groups.length === 0 ? (
          <section className="mf-hist-empty" role="alert">
            <span aria-hidden="true">✦</span>
            <h2>加载失败，请重试</h2>
            <p>内容没能加载出来，你的筛选选择已保留。</p>
            <button className="mf-hist-retry" type="button" onClick={refresh}>重新加载</button>
          </section>
        ) : (filter === "dual" ? visibleDual.length === 0 : visibleGroups.length === 0 && (filter !== "all" || visibleDual.length === 0)) ? (
          <section className="mf-hist-empty">
            <span aria-hidden="true">✦</span>
            <h2>{empty.title}</h2>
            <p>{empty.hint}</p>
            <Link className="mf-hist-retry" href="/home/relationship-test">浏览人物</Link>
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
                <button type="button" className="mf-lib-del" aria-label={`删除 ${group.name} 的浏览记录`} onClick={() => setPendingDelete({ kind: "single", id: group.starId, name: group.name })}>删除</button>
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
            {(filter === "all" || filter === "dual") && visibleDual.length ? visibleDual.map((report) => (
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
                <div className="mf-hist-entry-row">
                  <Link className="mf-hist-entry" href={`/home/dual-star-match/reports/${report.id}`}>
                    <b>双人合盘报告</b>
                    <small>{relativeTime(report.createdAt)}</small>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <div className="mf-lib-row-actions">
                    <Tag tone={report.status === "ready" ? "good" : report.status === "failed" ? "bad" : "warn"}>{report.status === "ready" ? "已完成" : report.status === "failed" ? "生成失败" : "生成中"}</Tag>
                    {report.status === "failed" ? <button type="button" className="mf-lib-del" onClick={() => void retryDual(report.id)}>重试</button> : null}
                    <button type="button" className="mf-lib-del" aria-label="删除这份合盘报告" onClick={() => setPendingDelete({ kind: "dual", id: report.id, name: `${report.nameA} × ${report.nameB}` })}>删除</button>
                  </div>
                </div>
              </article>
            )) : null}
          </div>
        )}
        <ConfirmDialog
          open={pendingDelete !== null}
          title="删除记录"
          message={pendingDelete ? `确定删除「${pendingDelete.name}」的${pendingDelete.kind === "dual" ? "合盘报告,删除后不可恢复" : "浏览记录"}吗?` : ""}
          confirmText="删除"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
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
