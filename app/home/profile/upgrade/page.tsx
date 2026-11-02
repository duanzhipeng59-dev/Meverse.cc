import type { Metadata } from "next";
import ReportTopbar from "../../../report-topbar";
import UpgradeShelf from "./upgrade-shelf";

export const metadata: Metadata = {
  title: "套餐与价格｜MeVerse AI 生辰画像",
  description: "生辰报告 × AI 追问，选择适合你的套餐。体验版 ¥89 起，支持支付宝付款。解锁完整八字解读：性格、事业、财富、感情全维度深度报告。",
  keywords: ["MeVerse价格", "生辰画像价格", "八字解读费用", "AI算命价格"],
  alternates: { canonical: "/home/profile/upgrade" },
};

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
