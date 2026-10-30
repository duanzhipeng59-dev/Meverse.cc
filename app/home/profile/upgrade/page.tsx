import type { Metadata } from "next";
import ReportTopbar from "../../../report-topbar";
import UpgradeShelf from "./upgrade-shelf";

export const metadata: Metadata = { title: "订阅升级" };

// 订阅升级页:从「我的」横条或确认页「查看套餐 · 立即解锁」进入;卡片内容与价格待定。
export default function UpgradePage() {
  return (
    <div className="mf-zr mf-upgrade-page">
      <ReportTopbar backHref="/home/profile" backLabel="返回我的" title="订阅升级" />
      <div className="mf-upgrade-body">
        <UpgradeShelf />
      </div>
    </div>
  );
}
