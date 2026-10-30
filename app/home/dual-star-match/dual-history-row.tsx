"use client";

import Link from "next/link";
import { useState } from "react";

// 历史记录横条(自填解读):主体是跳转链接,右端删除按钮与链接平级(不嵌套)。
// 删除用系统确认弹窗,成功由父组件回调本地移除(入口页静态化后 router.refresh 不会更新客户端数据)。
export default function DualHistoryRow({ id, title, sub, time, statusLabel, status, href, deleteEndpoint, onDeleted, onNavigate }: {
  id: string;
  title: string;
  sub?: string;
  time: string;
  statusLabel: string;
  status: string;
  href: string;
  deleteEndpoint: string;
  onDeleted?: (id: string) => void;
  // 提供时拦截点击(如待生成/失败记录客户端直跳排盘页,省一次服务端往返不闪 loading)
  onNavigate?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    if (deleting) return;
    if (!window.confirm(`删除「${title}」的记录？删除后不可恢复。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(deleteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      onDeleted?.(id);
    } catch {
      setDeleting(false);
      window.alert("删除失败，请重试");
    }
  };

  return (
    <div className="mf-dual-history-row-wrap">
      <Link
        className="mf-dual-history-row"
        href={href}
        onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(); } : undefined}
      >
        <span className="mf-dual-history-main">
          <span className="mf-dual-history-title">
            <b>{title}</b>
            <em data-status={status}>{statusLabel}</em>
          </span>
          {sub ? <small>{sub}</small> : null}
        </span>
        <small className="mf-dual-history-time">{time}</small>
      </Link>
      <button
        type="button"
        className="mf-dual-history-del"
        onClick={() => void doDelete()}
        disabled={deleting}
        aria-label={`删除 ${title} 的记录`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7" />
          <path d="M10.2 11v5M13.8 11v5" />
        </svg>
      </button>
    </div>
  );
}
