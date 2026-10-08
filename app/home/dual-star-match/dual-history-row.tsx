"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { portraitImage } from "../../myfate-image";

// 历史合盘横条:主体是跳转链接,右端删除按钮与链接平级(不嵌套),两次点击确认删除。
// 删除按 id+本人归属调用 API,成功后 router.refresh() 重拉列表。
export default function DualHistoryRow({ id, portraitA, portraitB, title, time, statusLabel, status }: {
  id: string;
  portraitA: string;
  portraitB: string;
  title: string;
  time: string;
  statusLabel: string;
  status: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  // 确认态 3 秒未操作自动回退,避免误触后一直停留在「确认删除」
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const askDelete = () => {
    setPhase("confirm");
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setPhase("idle"), 3000);
  };

  const doDelete = async () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setPhase("deleting");
    try {
      const res = await fetch("/api/dual-star/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2500);
    }
  };

  return (
    <div className="mf-dual-history-row-wrap">
      <Link className="mf-dual-history-row" href={`/home/dual-star-match/reports/${id}`}>
        <span className="mf-dual-history-avatars">
          <Image src={portraitImage(portraitA, 120)} alt="" width={30} height={39} unoptimized />
          <i aria-hidden="true">&amp;</i>
          <Image src={portraitImage(portraitB, 120)} alt="" width={30} height={39} unoptimized />
        </span>
        <b>{title}</b>
        <small>{time}</small>
        <em data-status={status}>{statusLabel}</em>
      </Link>
      <button
        type="button"
        className="mf-dual-history-del"
        data-phase={phase}
        disabled={phase === "deleting"}
        onClick={phase === "confirm" ? doDelete : askDelete}
        aria-label={phase === "confirm" ? `确认删除 ${title} 的合盘记录` : `删除 ${title} 的合盘记录`}
      >
        {phase === "confirm" ? "确认" : phase === "deleting" ? "…" : phase === "error" ? "失败" : "删除"}
      </button>
    </div>
  );
}
