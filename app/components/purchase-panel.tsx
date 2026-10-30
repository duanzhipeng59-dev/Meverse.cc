"use client";

import { useEffect, useRef, useState } from "react";

// 解读次数包购买弹窗(易支付/支付宝):选包下单 → 新开收银台 → 面板内轮询订单状态,
// 支付成功回调 onPaid(自动继续被 402 打断的生成动作)。
// 由父组件条件挂载(关闭即卸载),每次打开都是干净的选包态。
// 权威定价在服务端 RPC,这里的三档仅展示,金额与次数保持一致。
// 与服务端价格簿一致(报告次数 + 追问充值双额度)
const PACKS = [
  { id: "report_1", credits: 1, amount: "50", note: "生辰报告 1 次 · 不含追问" },
  { id: "bundle_trial", credits: 3, amount: "89", note: "报告 3 次 + 追问 10 条", best: true },
  { id: "bundle_adv", credits: 10, amount: "239", note: "报告 10 次 + 追问 50 条" },
  { id: "bundle_full", credits: 30, amount: "599", note: "报告 30 次 + 追问 300 条" },
  { id: "ask_30", credits: 0, amount: "39", note: "仅追问 30 条 · 不含报告" },
] as const;

type PayingOrder = { orderNo: string; token: string; checkoutUrl: string };

export default function PurchasePanel({ onClose, onPaid }: {
  onClose: () => void;
  onPaid?: () => void;
}) {
  const [phase, setPhase] = useState<"pick" | "paying">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<PayingOrder | null>(null);
  const paidRef = useRef(false);
  // onPaid 存 ref:避免父组件内联闭包让轮询 effect 反复重建
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  async function checkOrder(current: PayingOrder) {
    const res = await fetch(`/api/payments/epay/credits/status?order=${encodeURIComponent(current.orderNo)}&token=${encodeURIComponent(current.token)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { status?: string };
    if (data.status === "paid" && !paidRef.current) {
      paidRef.current = true;
      onClose();
      onPaidRef.current?.();
      return;
    }
    if (data.status === "cancelled") {
      setError("订单已超时取消，请重新选择次数包");
      setPhase("pick");
      setOrder(null);
    }
  }

  // paying 态轮询订单状态(3s);卸载即停
  useEffect(() => {
    if (phase !== "paying" || !order) return;
    const current = order;
    const tick = () => void checkOrder(current).catch(() => undefined);
    tick();
    const timer = window.setInterval(tick, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, order]);

  async function buy(packageId: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/epay/credits/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json() as { checkoutUrl?: string; orderNo?: string; accessToken?: string; error?: string };
      if (!res.ok || !data.checkoutUrl || !data.orderNo || !data.accessToken) {
        setError(data.error === "login_required" ? "请先登录后再购买" : "下单失败，请稍后重试");
        setBusy(false);
        return;
      }
      setOrder({ orderNo: data.orderNo, token: data.accessToken, checkoutUrl: data.checkoutUrl });
      setPhase("paying");
      // 异步上下文里 window.open 可能被拦截,打不开时用面板里的链接手动打开
      window.open(data.checkoutUrl, "_blank", "noopener");
    } catch {
      setError("网络异常，请重试");
      setBusy(false);
    }
  }

  return (
    <div className="mf-login-modal-overlay" role="dialog" aria-modal="true" aria-label="购买解读次数">
      <div className="mf-login-modal-mask" aria-hidden="true" onClick={onClose} />
      <section className="mf-login-card mf-login-modal-card mf-purchase">
        <div className="mf-reading-dialog-head">
          <h1>{phase === "pick" ? "购买解读次数" : "完成支付"}</h1>
          <button type="button" className="mf-reading-close" aria-label="关闭" onClick={onClose}>×</button>
        </div>

        {phase === "pick" ? (
          <div className="mf-purchase-packs">
            {PACKS.map((pack) => (
              <button type="button" key={pack.id} className={`mf-purchase-pack${"best" in pack && pack.best ? " is-best" : ""}`} disabled={busy} onClick={() => void buy(pack.id)}>
                <span className="mf-purchase-pack-main">
                  <b>{busy ? "下单中…" : pack.credits > 0 ? `${pack.credits} 次报告` : "追问包"}</b>
                  <small>{pack.note}</small>
                </span>
                <span className="mf-purchase-pack-price"><em>¥</em>{pack.amount}</span>
              </button>
            ))}
            <p className="mf-purchase-note">生成报告消耗 1 次报告额度，失败自动退回；追问每条消耗 1 次追问额度。</p>
          </div>
        ) : (
          <div className="mf-purchase-paying">
            <p className="mf-purchase-paying-main">已在新窗口打开支付宝收银台，完成支付后这里会自动继续。</p>
            <a className="mf-login-submit mf-start-submit" href={order?.checkoutUrl} target="_blank" rel="noopener noreferrer">打不开？点这里去支付</a>
            <button type="button" className="mf-purchase-reselect" onClick={() => { setPhase("pick"); setOrder(null); }}>换一个次数包</button>
          </div>
        )}
        {error ? <p className="mf-reading-dialog-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
