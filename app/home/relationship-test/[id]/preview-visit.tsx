"use client";

import { useEffect } from "react";
import { pushRecentStar } from "../../celebrity-match/celebrity-browser";

// 进入预览页即写入「最近查看」(本地;登录同步属持久化批次)
export default function StarCardScript({ starId }: { starId: string }) {
  useEffect(() => { pushRecentStar(starId); }, [starId]);

  // 进页直接展示内容区顶部:路由可能带着发现页的滚动位置做平滑滑动(scroll-behavior: smooth),
  // 挂载与下一帧各瞬时归顶一次,压制可见的滚动动画
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
