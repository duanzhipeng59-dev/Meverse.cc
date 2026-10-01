import type { Metadata } from "next";
import UpgradeWorkspace from "./upgrade-workspace";

export const metadata: Metadata = {
  title: "订阅升级",
  description: "选择适合你的 Myfate 解读套餐，每次解读附赠 10 次追问。",
};

export default function UpgradePage() {
  return <UpgradeWorkspace />;
}
