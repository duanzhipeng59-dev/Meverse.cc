"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./studio.module.css";

type OverviewRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  report_balance: number;
  ask_remaining: number;
  view_count: number;
  paid_amount: number;
};

type UsersData = {
  metrics: { totalUsers: number; dnu: number; newIn7d: number; newIn30d: number; payingUsers: number; revenue: number };
  daily: Array<{ day: string; count: number }>;
  users: OverviewRow[];
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmtSeen(value: string | null) {
  if (!value) return "从未";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 3_600_000) return "刚刚";
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return fmtDate(value);
}

export default function UsersPanel() {
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState("");
  const [granting, setGranting] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const body = await response.json() as UsersData & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "读取失败");
      setData(body);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function grant(userId: string, credits: number) {
    setGranting(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, credits }),
      });
      if (!response.ok) throw new Error("加额度失败");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加额度失败");
    } finally {
      setGranting("");
    }
  }

  if (error && !data) return <div className={styles.empty}>{error}</div>;
  if (!data) return <div className={styles.empty}><span className={styles.loader} />正在读取用户数据</div>;

  const maxDnu = Math.max(1, ...data.daily.map((row) => row.count));
  const metricCards = [
    { label: "总注册用户", value: data.metrics.totalUsers },
    { label: "今日新增 (DNU)", value: data.metrics.dnu, highlight: true },
    { label: "7 日新增", value: data.metrics.newIn7d },
    { label: "30 日新增", value: data.metrics.newIn30d },
    { label: "付费用户", value: data.metrics.payingUsers },
    { label: "累计收入 (¥)", value: data.metrics.revenue.toFixed(2) },
  ];

  return (
    <div className={styles.usersPanel}>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.metricGrid}>
        {metricCards.map((card) => (
          <div className={`${styles.metricCard} ${card.highlight ? styles.metricHot : ""}`} key={card.label}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.chartCard}>
        <h3>近 30 天每日新增用户 (DNU)</h3>
        <div className={styles.dnuChart}>
          {data.daily.map((row) => (
            <div className={styles.dnuBar} key={row.day} title={`${row.day.slice(0, 10)} · ${row.count} 人`}>
              <i style={{ height: `${Math.max(4, Math.round((row.count / maxDnu) * 100))}%` }} data-today={row.count > 0 ? undefined : undefined} />
              <small>{row.day.slice(8, 10)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.userTableCard}>
        <h3>用户明细 <small>共 {data.users.length} 位 · 按注册时间倒序</small></h3>
        <table className={styles.userTable}>
          <thead>
            <tr><th>邮箱</th><th>注册时间</th><th>最近登录</th><th>解读余额</th><th>追问余额</th><th>浏览数</th><th>累计付费</th><th>加额度</th></tr>
          </thead>
          <tbody>
            {data.users.map((row) => (
              <tr key={row.user_id}>
                <td title={row.user_id}>{row.email ?? "（无邮箱）"}</td>
                <td>{fmtDate(row.created_at)}</td>
                <td>{fmtSeen(row.last_sign_in_at)}</td>
                <td><b>{row.report_balance}</b></td>
                <td>{row.ask_remaining}</td>
                <td>{row.view_count}</td>
                <td>{Number(row.paid_amount) > 0 ? `¥${Number(row.paid_amount).toFixed(2)}` : "—"}</td>
                <td className={styles.grantCell}>
                  <button type="button" disabled={granting === row.user_id} onClick={() => void grant(row.user_id, 1)}>+1</button>
                  <button type="button" disabled={granting === row.user_id} onClick={() => void grant(row.user_id, 10)}>+10</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
