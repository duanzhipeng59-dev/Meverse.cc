"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { portraitImage } from "../../myfate-image";

// 历史合盘横条:主体是跳转链接,右端删除按钮与链接平级(不嵌套)。
// 点删除后整行切换为红色确认条(删除后不可恢复 + 取消/确认删除),点取消恢复;
// 删除成功由父组件回调本地移除(入口页静态化后 router.refresh 不会更新客户端数据)。
export default function DualHistoryRow({ id, portraitA, portraitB, title, time, statusLabel, status, onDeleted }: {
  id: string;
  portraitA: string;
  portraitB: string;
  title: string;
  time: string;
  statusLabel: string;
  status: string;
  onDeleted: (id: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "deleting" | "error">("idle");

  const doDelete = async () => {
    setPhase("deleting");
    try {
      const res = await fetch("/api/dual-star/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      onDeleted(id);
    } catch {
      setPhase("error");
    }
  };

  // 确认条:警示文案 + 失败提示/取消/确认删除
  if (phase !== "idle") {
    return (
      <div className="mf-dual-history-row-wrap is-confirm" role="alertdialog" aria-label={`确认删除 ${title} 的合盘记录`}>
        <div className="mf-dual-history-confirm">
          <b>{phase === "error" ? "删除失败，请重试" : "删除后不可恢复"}</b>
          <span className="mf-dual-hd-actions">
            <button type="button" className="mf-dual-hd-cancel" onClick={() => setPhase("idle")}>取消</button>
            <button type="button" className="mf-dual-hd-confirm" disabled={phase === "deleting"} onClick={doDelete}>
              {phase === "deleting" ? "删除中…" : "确认删除"}
            </button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mf-dual-history-row-wrap">
      <Link className="mf-dual-history-row" href={`/home/dual-star-match/reports/${id}`}>
        <span className="mf-dual-history-avatars">
          <Image src={portraitImage(portraitA, 120)} alt="" width={30} height={39} unoptimized />
          <i aria-hidden="true">&amp;</i>
          <Image src={portraitImage(portraitB, 120)} alt="" width={30} height={39} unoptimized />
        </span>
        <b>{title}</b>
        <span className="mf-dual-history-meta is-stacked">
          <small>{time}</small>
          <em data-status={status}>{statusLabel}</em>
        </span>
      </Link>
      <button
        type="button"
        className="mf-dual-history-del"
        onClick={() => setPhase("confirm")}
        aria-label={`删除 ${title} 的合盘记录`}
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
