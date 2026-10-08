import { Suspense } from "react";
import type { Metadata } from "next";
import DualStarPicker from "./dual-star-picker";
import DualHistorySection from "./dual-history-section";
import { getDualStarCandidates } from "../../myfate-dual-server";
import { isUpgradesEnabled } from "../../myfate-settings";

// 入口页静态化:候选列表与计费开关随 ISR 缓存(5 分钟重验证),
// 登录态与个人历史由 DualHistorySection 客户端拉取,页面壳可瞬时渲染。
export const revalidate = 300;
export const metadata: Metadata = { title: "双人合盘" };

export default async function DualStarMatchPage() {
  const [candidates, upgradesEnabled] = await Promise.all([getDualStarCandidates(), isUpgradesEnabled().catch(() => true)]);
  return (
    <>
      {/* useSearchParams 需要 Suspense 边界,静态页才能保留预渲染壳 */}
      <Suspense fallback={null}>
        <DualStarPicker candidates={candidates} upgradesEnabled={upgradesEnabled} />
      </Suspense>
      <DualHistorySection candidates={candidates} />
    </>
  );
}
