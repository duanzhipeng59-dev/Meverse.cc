"use client";

import { createPortal } from "react-dom";
import { StarReportSkeleton } from "./home/skeletons";

export type RouteSkeletonVariant = "star-report";

// 即时路由骨架:点击跳转的瞬间先以整屏报告骨架接管视口,新页 RSC 就绪后随旧路由一起卸载——
// 消除"停在旧页等新页加载完成才切换"的卡顿感。用于预览页「查看完整画像」与排盘入口「开始排盘/开始合盘」。
export default function RouteSkeleton({ active, variant }: { active: boolean; variant: RouteSkeletonVariant }) {
  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <div className="mf-route-skeleton" aria-busy="true" aria-label="正在加载页面">
      {variant === "star-report" ? <StarReportSkeleton /> : null}
    </div>,
    document.body,
  );
}
