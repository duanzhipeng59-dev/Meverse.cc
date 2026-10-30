"use client";

import { useEffect, useState } from "react";

// 套餐购买页:「套餐购买 / 按次购买」分栏,五个真实商品(双额度:报告次数+追问次数)。
// 套餐框 id 即支付系统的 packageId(服务端价格簿定价),点「立即购买」走易支付。
type PendingOrder = { planId: string; orderNo: string; token: string; checkoutUrl: string };

// 套餐框数据:perks 支持普通勾选项(字符串)或带叉的排除项({ text, denied })
type BoxPerk = string | { text: string; denied?: boolean };
type TrialBox = { id: string; title: string; desc?: string; price: string; perks: readonly BoxPerk[]; best?: boolean };

const TRIAL_BOXES: readonly TrialBox[] = [
  { id: "bundle_trial", title: "生成画像 体验版", desc: "顶级AI加持，严谨推演，先花几分钟看看准不准", perks: ["生辰报告3次", "追问10条"], price: "89" },
  { id: "bundle_adv", title: "全站通用 高级版", desc: "一顿饭的价钱，请一位随叫随到的命理师", perks: ["生辰报告10次", "追问50条"], price: "239", best: true },
  { id: "bundle_full", title: "全站通用 完整版", desc: "像做一次基因检测，把自己完全看清楚", perks: ["生辰报告30次", "追问300条"], price: "599" },
];

// 按次购买页签单独的套餐框
const PACK_BOXES: readonly TrialBox[] = [
  { id: "report_1", title: "生辰报告·1次", desc: "", price: "50", perks: [{ text: "不含追问次数", denied: true }, "生辰报告1次"] },
  { id: "ask_30", title: "30次追问", desc: "", price: "39", perks: [{ text: "不含报告生成", denied: true }, { text: "单独购买无法使用", denied: true }, "仅追问30条"] },
];

export default function UpgradeShelf() {
  const [tab, setTab] = useState<"sub" | "pack">("sub");
  const boxes: readonly TrialBox[] = tab === "pack" ? PACK_BOXES : TRIAL_BOXES;
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState("");

  // 等待支付:轮询订单状态,到账即提示;取消则回到可重试状态
  useEffect(() => {
    if (!pending) return;
    const current = pending;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/epay/credits/status?order=${encodeURIComponent(current.orderNo)}&token=${encodeURIComponent(current.token)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { status?: string };
        if (data.status === "paid") {
          setPaidId(current.planId);
          setPending(null);
        } else if (data.status === "cancelled") {
          setPending(null);
          setBuyError("订单已超时取消，请重新下单");
        }
      } catch { /* 网络抖动继续轮询 */ }
    };
    void tick();
    const timer = window.setInterval(tick, 3000);
    return () => window.clearInterval(timer);
  }, [pending]);

  // 下单:packageId 即套餐框 id(与服务端价格簿一致),新开收银台后轮询到账
  async function buyBox(packageId: string) {
    if (pending) return;
    setBuyError("");
    try {
      const res = await fetch("/api/payments/epay/credits/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json() as { checkoutUrl?: string; orderNo?: string; accessToken?: string; error?: string };
      if (!res.ok || !data.checkoutUrl || !data.orderNo || !data.accessToken) {
        setBuyError(data.error === "login_required" ? "请先登录后再购买" : "下单失败，请稍后重试");
        return;
      }
      // 异步上下文里 window.open 可能被拦截,打不开时用卡片下的链接手动打开
      window.open(data.checkoutUrl, "_blank", "noopener");
      setPending({ planId: packageId, orderNo: data.orderNo, token: data.accessToken, checkoutUrl: data.checkoutUrl });
    } catch {
      setBuyError("网络异常，请重试");
    }
  }

  return (
    <>
      <div className="mf-start-seg mf-upgrade-seg" role="tablist" aria-label="购买方式">
        <button type="button" role="tab" aria-selected={tab === "sub"} className={tab === "sub" ? "is-on" : ""} onClick={() => setTab("sub")}>套餐购买</button>
        <button type="button" role="tab" aria-selected={tab === "pack"} className={tab === "pack" ? "is-on" : ""} onClick={() => setTab("pack")}>按次购买</button>
      </div>

      {boxes.map((box) => (
        <div className={`mf-upgrade-box${box.best ? " is-best" : ""}`} key={box.id}>
          <div className="mf-upgrade-box-body">
            <b>{box.title}</b>
            {box.desc ? <p className="mf-upgrade-box-desc">{box.desc}</p> : null}
            <ul>
              {box.perks.map((perk) => {
                const text = typeof perk === "string" ? perk : perk.text;
                const denied = typeof perk !== "string" && perk.denied;
                return (
                  <li key={text} className={denied ? "is-denied" : undefined}>
                    <i aria-hidden="true">{denied ? "✕" : "✓"}</i>{text}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mf-upgrade-box-bar">
            <span className="mf-upgrade-box-bar-price"><em>¥</em>{box.price}</span>
            <button
              type="button"
              className="mf-upgrade-box-buy"
              disabled={Boolean(pending) || paidId === box.id}
              onClick={() => void buyBox(box.id)}
            >
              {pending?.planId === box.id ? "等待支付…" : paidId === box.id ? "已到账 ✓" : "立即购买"}
            </button>
          </div>
        </div>
      ))}

      {pending ? (
        <div className="mf-upgrade-pay-wait">
          <p>已打开支付宝收银台，完成支付后这里会自动确认到账。</p>
          <a href={pending.checkoutUrl} target="_blank" rel="noopener noreferrer">打不开？点这里去支付</a>
        </div>
      ) : null}
      {paidId ? <p className="mf-upgrade-paid">✓ 支付成功，次数已到账，可直接去生成解读。</p> : null}
      {buyError ? <p className="mf-reading-dialog-error" role="alert">{buyError}</p> : null}
    </>
  );
}
