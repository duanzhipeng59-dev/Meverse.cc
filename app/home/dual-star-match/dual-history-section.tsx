"use client";

import { useEffect, useState } from "react";
import DualHistoryRow from "./dual-history-row";
import type { DualStarCandidate } from "../../myfate-dual-server";

// 历史合盘区:入口页静态化后,个人历史在客户端拉取。
// 拉取期间不渲染任何中间态(无骨架动画),数据到位后整块出现,避免部分渲染闪烁。
// 中文名映射沿用候选列表(与旧服务端 personOf 逻辑一致:role「组合-本名」取本名)。
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

export default function DualHistorySection({ candidates }: { candidates: DualStarCandidate[] }) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/dual-star/bootstrap")
      .then((res) => (res.ok ? res.json() as Promise<{ history?: HistoryRow[] }> : Promise.reject(new Error(String(res.status)))))
      .then((data) => { if (alive) setRows(data.history ?? []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  if (!rows?.length) return null;

  const personOf = (id: string, fallback: string) => {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate) return fallback;
    const dash = candidate.role.indexOf("-");
    return dash > 0 ? candidate.role.slice(dash + 1).trim() : candidate.name;
  };

  return (
    <section className="mf-dual mf-dual-history-zone" aria-label="历史合盘记录">
      <h2>历史合盘</h2>
      <div className="mf-dual-history-list">
        {rows.map((row) => {
          // 接口给 UTC,统一按东八区展示
          const shifted = new Date(new Date(row.createdAt).getTime() + 8 * 3600_000);
          const time = `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
          return (
            <DualHistoryRow
              key={row.id}
              id={row.id}
              portraitA={row.portraitA}
              portraitB={row.portraitB}
              title={`${personOf(row.starA, row.nameA)} × ${personOf(row.starB, row.nameB)}`}
              time={time}
              status={row.status}
              statusLabel={STATUS_LABELS[row.status] ?? row.status}
            />
          );
        })}
      </div>
    </section>
  );
}
