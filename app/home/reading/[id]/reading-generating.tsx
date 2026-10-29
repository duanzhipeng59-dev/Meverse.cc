"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PHASES = ["正在排定命盘…", "正在分析十神格局…", "正在撰写章节解读…", "正在整理大运流年…"];
// 进度按真实耗时推进:预计 75 秒走满 95%,之后卡住等真实完成,ready 后先走满 100% 再进报告。
// 全程只显示进度条,不出现百分比数字。
const EXPECTED_SECONDS = 75;
const CAP_PERCENT = 95;

// 解读报告生成中:呼吸星标+连续进度条(时间驱动,95%封顶,完成走满)+阶段文案,轮询 reading API。
// 进度按报告的服务端创建时间起算(createdAt 由页面传入),退出再进不会归零。
export default function ReadingGenerating({ reportId, createdAt }: { reportId: string; createdAt: string }) {
  const router = useRouter();
  const startedAt = Date.parse(createdAt);
  // 首帧不取时钟避免 SSR 水合不一致,挂载后按秒走
  const [now, setNow] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const elapsedTimer = window.setInterval(() => setNow(Date.now()), 1000);
    let stop = false;
    async function poll() {
      if (stop) return;
      try {
        const response = await fetch(`/api/reading/${reportId}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { status?: string };
          if (data.status === "ready") {
            // 先把进度条走满,给一个"完成"的视觉瞬间,再刷新出报告
            setCompleting(true);
            window.setTimeout(() => {
              if (!stop) {
                setFinished(true);
                router.refresh();
              }
            }, 600);
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
      window.clearInterval(elapsedTimer);
    };
  }, [reportId, router]);

  if (failed || finished) return null;

  // 时钟未校准(SSR 首帧)时只占位不画进度条:校准后第一帧直接落在真实进度上,
  // 避免重进页面时"从 0 追赶到当前位置"的动画;此后每秒推进才有平滑过渡。
  if (now === null) return <div className="mf-dual-status" aria-hidden="true" />;

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const percent = completing ? 100 : Math.max(2, Math.min(CAP_PERCENT, Math.round((elapsed / EXPECTED_SECONDS) * CAP_PERCENT)));
  const phase = percent >= CAP_PERCENT ? 3 : percent >= 50 ? 2 : percent >= 25 ? 1 : 0;

  return (
    <div className="mf-dual-status">
      <span className="mf-dual-star" aria-hidden="true">✦</span>
      <div className="mf-dual-progress is-real" aria-hidden="true">
        <span className="mf-dual-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="mf-dual-status-note">{percent >= CAP_PERCENT ? "正在收尾…" : PHASES[phase]}</p>
      <p className="mf-dual-status-time">已等待 {elapsed} 秒 · 预计 1~2 分钟；退出页面也会后台继续生成，稍后在「生成记录」查看</p>
    </div>
  );
}
