import type { Metadata } from "next";
import UpgradeWorkspace from "./upgrade-workspace";
import { redirect } from "next/navigation";
import { requirePageUser } from "../../require-page-user";
import { isUpgradesEnabled } from "../../myfate-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "订阅升级",
  description: "选择适合你的 Myfate 解读套餐，每次解读附赠 10 次追问。",
};

export default async function UpgradePage() {
  await requirePageUser("/home/upgrade");
  if (!(await isUpgradesEnabled())) redirect("/home");
  return <UpgradeWorkspace />;
}
