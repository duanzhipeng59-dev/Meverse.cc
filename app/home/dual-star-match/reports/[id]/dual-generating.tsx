"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PHASES = ["正在比对两人命盘…", "正在分析互动结构…", "正在撰写关系解读…", "正在整理命理依据…"];

// 生成中/失败两态:轮询报告状态,可随时离开(后台继续生成,完成后在浏览记录可见)。
export default function DualGenerating({ reportId, nameA, nameB, portraitA, portraitB }: { reportId: string; nameA: string; nameB: string; portraitA: string; portraitB: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const phaseTimer = window.setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4000);
    let stop = false;
    async function poll() {
      if (stop || !alive.current) return;
      try {
        const response = await fetch(`/api/dual-star/${reportId}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { status?: string };
          if (data.status === "ready") {
            router.refresh();
            return;
          }
          if (data.status === "failed") {
            setFailed(true);
            return;
          }
        }
      } catch {
        // 网络抖动继续轮询
      }
      if (alive.current && !stop) window.setTimeout(poll, 3000);
    }
    poll();
    return () => {
      alive.current = false;
      stop = true;
      window.clearInterval(phaseTimer);
    };
  }, [reportId, router]);

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    setFailed(false);
    try {
      await fetch(`/api/dual-star/${reportId}`, { method: "POST" });
      setPhase(0);
      window.setTimeout(() => {
        if (alive.current) window.location.reload();
      }, 800);
    } catch {
      setFailed(true);
      setRetrying(false);
    }
  }

  return (
    <div className="mf-dual-status">
      <div className="mf-dual-status-people">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitA} alt={`${nameA}的人物肖像`} />
        <span aria-hidden="true">×</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitB} alt={`${nameB}的人物肖像`} />
      </div>
      <b>{nameA} × {nameB}</b>
      {failed ? (
        <>
          <p className="mf-dual-status-title">报告生成没有成功</p>
          <p className="mf-dual-status-note">额度已自动退回。可以重新生成（不会重复扣费），或返回双人合盘重新选择。</p>
          <div className="mf-dual-actions">
            <button className="mf-primary-button mf-dual-generate" type="button" disabled={retrying} onClick={retry}>
              {retrying ? "正在重新生成…" : "重新生成"}
            </button>
            <Link className="mf-dual-ghost" href="/home/dual-star-match">返回双人合盘</Link>
          </div>
        </>
      ) : (
        <>
          <p className="mf-dual-status-title"><i className="mf-launch-spinner" aria-hidden="true" />正在生成双人合盘报告</p>
          <p className="mf-dual-status-note">{PHASES[phase]}</p>
          <p className="mf-dual-status-note is-soft">报告会在后台继续生成，完成后可在浏览记录中查看。你可以放心离开这个页面。</p>
        </>
      )}
    </div>
  );
}
