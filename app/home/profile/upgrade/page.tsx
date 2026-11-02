import type { Metadata } from "next";
import ReportTopbar from "../../../report-topbar";
import UpgradeShelf from "./upgrade-shelf";
import ViewTracker from "./view-tracker";
import Trans from "../../../trans";

export const metadata: Metadata = {
  title: "套餐与价格｜MeVerse AI 生辰画像",
  description: "生辰报告 × AI 追问，选择适合你的套餐。体验版 ¥89 起，支持支付宝付款。解锁完整八字解读：性格、事业、财富、感情全维度深度报告。",
  keywords: ["MeVerse价格", "生辰画像价格", "八字解读费用", "AI算命价格"],
  alternates: { canonical: "/home/profile/upgrade" },
};

// 订阅升级页:从「我的」横条、确认页「查看套餐 · 立即解锁」或追问充值进入;
// ?from= 标记来源(confirm/profile/ask),进入即落 page_events 表,供逐用户漏斗分析。
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const params = await searchParams;
  const from = Array.isArray(params?.from) ? params.from[0] : params?.from;

  return (
    <div className="mf-zr mf-upgrade-page">
      <ReportTopbar backHref="/home/profile" backLabel={<Trans k="upgrade.back" />} title={<Trans k="upgrade.topbar.title" />} />
      <ViewTracker event="upgrade_page_view" source={from ?? "direct"} />
      <div className="mf-upgrade-body">
        <UpgradeShelf />
      </div>
    </div>
  );
}
