"use client";

import { useEffect, useState } from "react";
import DualHistoryRow from "./dual-history-row";
import { useAuth } from "../../auth-context";
import type { DualStarCandidate } from "../../myfate-dual-server";

// 历史合盘区:入口页静态化后,个人历史在客户端拉取。
// 无感策略(stale-while-revalidate,按登录 email 隔离缓存):
//   1) 模块内存 + sessionStorage 两级缓存,二次进入同步命中、首帧整块渲染零等待;
//   2) 挂载同时后台静默对账,数据有变才替换(浅比较),无骨架、无中间态;
//   3) 删除成功由本组件本地移除并回写缓存(静态壳下 router.refresh 不会更新客户端数据)。
// auth-context 从 localStorage 同步恢复会话,登录用户首帧即有 email,缓存可同步命中。
const CACHE_KEY = "myfate_dual_history_v1";
const STATUS_LABELS: Record<string, string> = { ready: "已生成", generating: "生成中", failed: "生成失败" };

type HistoryRow = {
  id: string;
  starA: string;
  starB: string;
  nameA: string;
  nameB: string;
  portraitA: string;
  portraitB: string;
  status: string;
  createdAt: string;
};

type CacheShape = { email: string; rows: HistoryRow[] };
let memoryCache: CacheShape | null = null;

function readCache(email: string): HistoryRow[] | null {
  if (memoryCache) return memoryCache.email === email ? memoryCache.rows : null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.email !== email) return null;
    memoryCache = parsed;
    return parsed.rows;
  } catch {
    return null;
  }
}

function writeCache(email: string, rows: HistoryRow[]) {
  memoryCache = { email, rows };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // 隐私模式忽略
  }
}

const sameList = (a: HistoryRow[], b: HistoryRow[]) => JSON.stringify(a) === JSON.stringify(b);

export default function DualHistorySection({ candidates }: { candidates: DualStarCandidate[] }) {
  const { status, email } = useAuth();
  const loggedIn = status === "authenticated" && Boolean(email);
  // 惰性初始化仅在已登录(email 已知)时读缓存,未登录/加载中首帧不渲染,避免跨账号闪现
  const [rows, setRows] = useState<HistoryRow[] | null>(() => (loggedIn && email ? readCache(email) : null));

  useEffect(() => {
    if (!loggedIn || !email) return;
    // 缓存未命中时先补一次同步读取(email 由 loading→authenticated 变化时,初始 useState 已错过)
    setRows((prev) => prev ?? readCache(email));
    let alive = true;
    fetch("/api/dual-star/bootstrap")
      .then((res) => (res.ok ? res.json() as Promise<{ history?: HistoryRow[] }> : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!alive) return;
        const next = data.history ?? [];
        writeCache(email, next);
        setRows((prev) => (prev && sameList(prev, next) ? prev : next));
      })
      .catch(() => { if (alive) setRows((prev) => prev ?? []); });
    return () => { alive = false; };
  }, [loggedIn, email]);

  if (!loggedIn || !rows?.length) return null;

  const personOf = (id: string, fallback: string) => {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate) return fallback;
    const dash = candidate.role.indexOf("-");
    return dash > 0 ? candidate.role.slice(dash + 1).trim() : candidate.name;
  };

  const handleDeleted = (id: string) => {
    if (!email) return;
    setRows((prev) => {
      const next = prev ? prev.filter((row) => row.id !== id) : null;
      if (next) writeCache(email, next);
      return next;
    });
  };

  return (
    <section className="mf-dual mf-dual-history-zone" aria-label="历史合盘记录">
      <h2>历史合盘</h2>
      <div className="mf-dual-history-list">
        {rows.map((row) => {
          // 接口给 UTC,转东八区用于 aria 语义(行内不再展示时间)
          const shifted = new Date(new Date(row.createdAt).getTime() + 8 * 3600_000);
          const time = `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
          return (
            <DualHistoryRow
              key={row.id}
              id={row.id}
              portraitA={row.portraitA}
              portraitB={row.portraitB}
              title={`${personOf(row.starA, row.nameA)} × ${personOf(row.starB, row.nameB)}`}
              createdAt={time}
              status={row.status}
              statusLabel={STATUS_LABELS[row.status] ?? row.status}
              onDeleted={handleDeleted}
            />
          );
        })}
      </div>
    </section>
  );
}
