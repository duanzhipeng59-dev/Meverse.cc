"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { portraitImage } from "../../myfate-image";

// 历史合盘横条:主体是跳转链接,右端删除按钮与链接平级(不嵌套)。
// 布局:左侧纵向块(双头像在上、名称在下),右侧状态标签;不展示时间(产品要求)。
// 点删除后整行切换为红色确认条(删除后不可恢复 + 取消/确认删除),点取消恢复;
// 删除成功由父组件回调本地移除(入口页静态化后 router.refresh 不会更新客户端数据)。
export default function DualHistoryRow({ id, portraitA, portraitB, title, statusLabel, status, onDeleted }: {
  id: string;
  portraitA: string;
  portraitB: string;
  title: string;
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
        <span className="mf-dual-history-id">
          <span className="mf-dual-history-avatars">
            <Image src={portraitImage(portraitA, 120)} alt="" width={30} height={39} unoptimized />
            <i aria-hidden="true">&amp;</i>
            <Image src={portraitImage(portraitB, 120)} alt="" width={30} height={39} unoptimized />
          </span>
          <b>{title}</b>
        </span>
        <em data-status={status}>{statusLabel}</em>
      </Link>
      <button
        type="button"
        className="mf-dual-history-del"
        onClick={() => setPhase("confirm")}
        aria-label={`删除 ${title} 的合盘记录`}
      >
        删除
      </button>
    </div>
  );
}
