import type { Metadata } from "next";
import UpgradeWorkspace from "./upgrade-workspace";

export const metadata: Metadata = {
  title: "订阅升级",
  description: "选择适合你的 Myfate 报告次数包。",
};

export default function UpgradePage() {
  return <UpgradeWorkspace />;
}
