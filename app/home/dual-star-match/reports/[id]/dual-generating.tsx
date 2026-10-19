"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PHASES = ["正在比对两人命盘…", "正在分析互动结构…", "正在撰写关系解读…", "正在整理命理依据…"];

// 生成中/失败两态:轮询报告状态,可随时离开(后台继续生成,完成后在浏览记录可见)。
export default function DualGenerating({ reportId, nameA, nameB, portraitA, portraitB }: { reportId: string; nameA: string; nameB: string; portraitA: string; portraitB: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
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


  // 失败态不渲染任何主体内容(顶栏仍在页面壳上),失败信息由历史合盘的状态标签承载
  if (failed) return null;

  return (
    <div className="mf-dual-status">
      <span className="mf-dual-star" aria-hidden="true">✦</span>
      <div className="mf-dual-progress" aria-hidden="true">
        {PHASES.map((_, index) => (
          <span key={index} data-state={index < phase ? "done" : index === phase ? "active" : "todo"}><i /></span>
        ))}
      </div>
      <p className="mf-dual-status-note">{PHASES[phase]}</p>
    </div>
  );
}
