import type { Metadata } from "next";
import UpgradeWorkspace from "./upgrade-workspace";
import { requirePageUser } from "../../require-page-user";
import { isUpgradesEnabled } from "../../myfate-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "订阅升级",
  description: "选择适合你的 Myfate 解读套餐，每次解读附赠 10 次追问。",
};

export default async function UpgradePage() {
  await requirePageUser("/home/upgrade");
  if (!(await isUpgradesEnabled())) {
    return (
      <div className="mf-upgrade-workspace">
        <section className="mf-hist-empty" style={{ marginTop: 40 }}>
          <span aria-hidden="true">✦</span>
          <h2>订阅升级暂时关闭</h2>
          <p>功能维护中，请稍后再来。已购买的额度不受影响。</p>
        </section>
      </div>
    );
  }
  return <UpgradeWorkspace />;
}
