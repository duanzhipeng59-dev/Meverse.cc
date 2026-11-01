"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../language-context";

// 套餐购买页:「套餐购买 / 按次购买」分栏,五个真实商品(双额度:报告次数+追问次数)。
// 套餐框 id 即支付系统的 packageId(服务端价格簿定价),点「立即购买」走易支付。
type PendingOrder = { planId: string; orderNo: string; token: string; checkoutUrl: string };

// 套餐框骨架:title/desc/perks 为 i18n key(perks 支持带参/排除项),渲染时经 t() 取文案
type BoxPerk = string | { key: string; params?: Record<string, string | number>; denied?: boolean };
type TrialBox = { id: string; titleKey: string; paramsTitle?: Record<string, string | number>; descKey?: string; price: string; perks: readonly BoxPerk[]; best?: boolean };

const TRIAL_BOXES: readonly TrialBox[] = [
  { id: "bundle_trial", titleKey: "upgrade.box.trial.title", descKey: "upgrade.box.trial.desc", price: "89", perks: [{ key: "upgrade.perk.report", params: { n: 3 } }, { key: "upgrade.perk.ask", params: { n: 10 } }] },
  { id: "bundle_adv", titleKey: "upgrade.box.adv.title", descKey: "upgrade.box.adv.desc", price: "239", best: true, perks: [{ key: "upgrade.perk.report", params: { n: 10 } }, { key: "upgrade.perk.ask", params: { n: 50 } }] },
  { id: "bundle_full", titleKey: "upgrade.box.full.title", descKey: "upgrade.box.full.desc", price: "599", perks: [{ key: "upgrade.perk.report", params: { n: 30 } }, { key: "upgrade.perk.ask", params: { n: 300 } }] },
];

// 按次购买页签单独的套餐框
const PACK_BOXES: readonly TrialBox[] = [
  { id: "report_1", titleKey: "upgrade.box.report.title", paramsTitle: { n: 1 }, price: "50", perks: [{ key: "upgrade.perk.noAsk", denied: true }, { key: "upgrade.perk.report", params: { n: 1 } }] },
  { id: "ask_30", titleKey: "upgrade.box.ask.title", paramsTitle: { n: 30 }, price: "39", perks: [{ key: "upgrade.perk.noReport", denied: true }, { key: "upgrade.perk.askStandalone", denied: true }, { key: "upgrade.perk.askOnly", params: { n: 30 } }] },
];

export default function UpgradeShelf() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"sub" | "pack">("sub");
  const boxes: readonly TrialBox[] = tab === "pack" ? PACK_BOXES : TRIAL_BOXES;
  const [pending, setPending] = useState<PendingOrder | null>(null);
  // 点击下单到接口返回之间的过渡态(防止无反馈/连点)
  const [submittingId, setSubmittingId] = useState<string | null>(null);
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
          setBuyError(t("upgrade.err.timeout"));
        }
      } catch { /* 网络抖动继续轮询 */ }
    };
    void tick();
    const timer = window.setInterval(tick, 3000);
    return () => window.clearInterval(timer);
  }, [pending, t]);

  // 下单:packageId 即套餐框 id(与服务端价格簿一致),新开收银台后轮询到账
  async function buyBox(packageId: string) {
    if (pending || submittingId) return;
    setSubmittingId(packageId);
    setBuyError("");
    try {
      const res = await fetch("/api/payments/epay/credits/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json() as { checkoutUrl?: string; orderNo?: string; accessToken?: string; error?: string };
      if (!res.ok || !data.checkoutUrl || !data.orderNo || !data.accessToken) {
        setBuyError(data.error === "login_required" ? t("upgrade.err.login") : t("upgrade.err.fail"));
        setSubmittingId(null);
        return;
      }
      // 异步上下文里 window.open 可能被拦截,打不开时用卡片下的链接手动打开
      window.open(data.checkoutUrl, "_blank", "noopener");
      setPending({ planId: packageId, orderNo: data.orderNo, token: data.accessToken, checkoutUrl: data.checkoutUrl });
      setSubmittingId(null);
    } catch {
      setBuyError(t("upgrade.err.network"));
      setSubmittingId(null);
    }
  }

  return (
    <>
      <div className="mf-start-seg mf-upgrade-seg" role="tablist" aria-label={t("upgrade.tabs.aria")}>
        <button type="button" role="tab" aria-selected={tab === "sub"} className={tab === "sub" ? "is-on" : ""} onClick={() => setTab("sub")}>{t("upgrade.tab.sub")}</button>
        <button type="button" role="tab" aria-selected={tab === "pack"} className={tab === "pack" ? "is-on" : ""} onClick={() => setTab("pack")}>{t("upgrade.tab.pack")}</button>
      </div>

      {boxes.map((box) => (
        <div className={`mf-upgrade-box${box.best ? " is-best" : ""}`} key={box.id}>
          <div className="mf-upgrade-box-body">
            <b>{t(box.titleKey, box.paramsTitle)}</b>
            {box.descKey ? <p className="mf-upgrade-box-desc">{t(box.descKey)}</p> : null}
            <ul>
              {box.perks.map((perk) => {
                const text = typeof perk === "string" ? t(perk) : t(perk.key, perk.params);
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
              disabled={Boolean(pending) || Boolean(submittingId) || paidId === box.id}
              onClick={() => void buyBox(box.id)}
            >
              {submittingId === box.id ? t("upgrade.buy.jumping") : pending?.planId === box.id ? t("upgrade.buy.waiting") : paidId === box.id ? t("upgrade.buy.paid") : t("upgrade.buy.now")}
            </button>
          </div>
          {paidId === box.id ? <p className="mf-upgrade-paid">{t("upgrade.paid.note")}</p> : null}
        </div>
      ))}

      {pending ? (
        <div className="mf-upgrade-pay-wait">
          <p>{t("upgrade.wait.note")}</p>
          <a href={pending.checkoutUrl} target="_blank" rel="noopener noreferrer">{t("upgrade.wait.link")}</a>
        </div>
      ) : null}
      {buyError ? <p className="mf-reading-dialog-error" role="alert">{buyError}</p> : null}
    </>
  );
}
