"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PHASES = ["正在排定命盘…", "正在分析十神格局…", "正在撰写章节解读…", "正在整理大运流年…"];

// 解读报告生成中:与偶像合盘生成页同款视觉(呼吸星标+四段进度条+阶段文案),轮询 reading API。
export default function ReadingGenerating({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const phaseTimer = window.setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4000);
    let stop = false;
    async function poll() {
      if (stop) return;
      try {
        const response = await fetch(`/api/reading/${reportId}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { status?: string };
          if (data.status === "ready") {
            setDone(true);
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
      if (!stop) window.setTimeout(poll, 3000);
    }
    poll();
    return () => {
      stop = true;
      window.clearInterval(phaseTimer);
    };
  }, [reportId, router]);

  if (failed || done) return null;

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
