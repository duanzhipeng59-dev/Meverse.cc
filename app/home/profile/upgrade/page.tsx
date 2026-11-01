import type { Metadata } from "next";
import ReportTopbar from "../../../report-topbar";
import UpgradeShelf from "./upgrade-shelf";
import ViewTracker from "./view-tracker";
import Trans from "../../../trans";

export const metadata: Metadata = { title: "订阅升级" };

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
