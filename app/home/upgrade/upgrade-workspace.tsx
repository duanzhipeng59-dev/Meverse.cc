"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";

type PurchaseMode = "package" | "single";
type PackageId = "trial" | "explore" | "deep" | "single";

type UpgradePackage = {
  id: PackageId;
  mode: PurchaseMode;
  name: string;
  price: number;
  uses: number;
  usesLabel: string;
  unitPrice: string;
  description: string;
  badge?: string;
};

const packages: readonly UpgradePackage[] = [
  {
    id: "trial",
    mode: "package",
    name: "体验版",
    price: 89,
    uses: 3,
    usesLabel: "3 次报告",
    unitPrice: "29.67",
    description: "适合先体验几次解读分析",
  },
  {
    id: "explore",
    mode: "package",
    name: "探索版",
    price: 239,
    uses: 10,
    usesLabel: "10 次报告",
    unitPrice: "23.90",
    description: "适合持续探索不同关系",
    badge: "推荐",
  },
  {
    id: "deep",
    mode: "package",
    name: "深度版",
    price: 499,
    uses: 30,
    usesLabel: "30 次报告",
    unitPrice: "16.63",
    description: "适合高频使用与长期探索",
    badge: "单次最省",
  },
  {
    id: "single",
    mode: "single",
    name: "单次报告",
    price: 50,
    uses: 1,
    usesLabel: "1 次报告",
    unitPrice: "50.00",
    description: "适合只想体验一次完整解读",
  },
] as const;

type CreditCheckout = {
  checkoutUrl: string;
  qrContent: string;
  orderNo: string;
  accessToken: string;
};

export default function UpgradeWorkspace() {
  const { status } = useAuth();
  const [mode, setMode] = useState<PurchaseMode>("package");
  const [selectedId, setSelectedId] = useState<PackageId>("explore");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [checkout, setCheckout] = useState<CreditCheckout | null>(null);
  const [payState, setPayState] = useState<"idle" | "creating" | "pending" | "paid">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const visiblePackages = packages.filter((item) => item.mode === mode);
  const selectedPackage = packages.find((item) => item.id === selectedId) ?? packages[1];

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetch("/api/myfate/credits").then((response) => response.json() as Promise<{ balance?: number }>).then((data) => {
      if (active && typeof data.balance === "number") setBalance(data.balance);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [status]);

  useEffect(() => {
    if (!checkout?.qrContent) return;
    let active = true;
    import("qrcode-generator").then(({ default: qrcode }) => {
      if (!active) return;
      const code = qrcode(0, "M");
      code.addData(checkout.qrContent);
      code.make();
      setQrDataUrl(code.createDataURL(6, 4));
    });
    return () => { active = false; };
  }, [checkout?.qrContent]);

  useEffect(() => {
    if (!checkout || payState !== "pending") return;
    const payment = checkout;
    let active = true;
    let timer: number | undefined;
    let attempts = 0;
    async function check() {
      try {
        const params = new URLSearchParams({ order: payment.orderNo, token: payment.accessToken });
        const response = await fetch(`/api/payments/epay/credits/status?${params.toString()}`);
        const data = await response.json() as { status?: string; balance?: number };
        if (!active) return;
        if (data.status === "paid") {
          setPayState("paid");
          if (typeof data.balance === "number") setBalance(data.balance);
          window.dispatchEvent(new CustomEvent("myfate-credits-updated"));
          return;
        }
        if (data.status === "cancelled") {
          setPayState("idle");
          setCheckout(null);
          setMessage("订单已取消，可重新选择套餐购买。");
          return;
        }
      } catch { /* keep polling */ }
      if (!active) return;
      attempts += 1;
      if (attempts >= 60) {
        setPayState("idle");
        setCheckout(null);
        setMessage("支付等待超时，未完成支付可重新下单。");
        return;
      }
      timer = window.setTimeout(() => void check(), 3000);
    }
    void check();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [checkout, payState]);

  async function startPayment() {
    setPayState("creating");
    setMessage("");
    try {
      const response = await fetch("/api/payments/epay/credits/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });
      const data = await response.json() as Partial<CreditCheckout> & { error?: string };
      if (!response.ok || !data.checkoutUrl || !data.qrContent || !data.orderNo || !data.accessToken) {
        setPayState("idle");
        setMessage(data.error === "login_required" ? "请先登录后再购买。" : "暂时无法创建订单，请稍后重试。");
        return;
      }
      setQrDataUrl(null);
      setCheckout({ checkoutUrl: data.checkoutUrl, qrContent: data.qrContent, orderNo: data.orderNo, accessToken: data.accessToken });
      setPayState("pending");
    } catch {
      setPayState("idle");
      setMessage("网络异常，请稍后重试。");
    }
  }

  function changeMode(nextMode: PurchaseMode) {
    setMode(nextMode);
    setSelectedId(nextMode === "package" ? "explore" : "single");
    setMessage("");
  }

  return (
    <div className="mf-upgrade-workspace">
      <header className="mf-upgrade-heading">
        <span className="mf-kicker">MYFATE PACKAGES</span>
        <h1>选择你的关系探索方式</h1>
        <p>{mode === "package" ? "购买多次报告套餐，次数按需使用，合盘与个人解读通用。" : "单次购买一份报告，用完后可再次购买。"}</p>
        {typeof balance === "number" ? <p className="mf-upgrade-balance">当前剩余报告额度：<strong>{balance}</strong> 次</p> : null}
      </header>

      <div className="mf-upgrade-tabs" role="tablist" aria-label="购买方式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "package"}
          className={mode === "package" ? "is-active" : undefined}
          onClick={() => changeMode("package")}
        >
          套餐购买
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "is-active" : undefined}
          onClick={() => changeMode("single")}
        >
          按次购买
        </button>
      </div>

      <div className={mode === "single" ? "mf-upgrade-plan-grid is-single" : "mf-upgrade-plan-grid"} role="radiogroup" aria-label={mode === "package" ? "套餐购买选项" : "按次购买选项"}>
        {visiblePackages.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              className={selected ? "mf-upgrade-plan is-selected" : "mf-upgrade-plan"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setSelectedId(item.id);
                setMessage("");
              }}
              key={item.id}
            >
              <span className="mf-upgrade-plan-topline">
                <span className="mf-upgrade-plan-name">{item.name}</span>
                {item.badge ? <span className="mf-upgrade-plan-badge">{item.badge}</span> : null}
              </span>
              <span className="mf-upgrade-plan-price"><small>¥</small>{item.price}</span>
              <span className="mf-upgrade-plan-uses"><strong>{item.usesLabel}</strong></span>
              <span className="mf-upgrade-plan-unit">约 ¥{item.unitPrice} / 次</span>
              <span className="mf-upgrade-plan-description">{item.description}</span>
              <span className="mf-upgrade-plan-check" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      <section className="mf-upgrade-checkout" aria-label="已选套餐">
        <div>
          <span>已选择</span>
          <strong>{selectedPackage.name} · {selectedPackage.usesLabel}</strong>
          <small>¥{selectedPackage.price}，一次购买，不自动续费</small>
        </div>
        {status === "authenticated" ? (
          <button
            className="mf-primary-button"
            type="button"
            disabled={payState === "creating" || payState === "pending"}
            onClick={() => void startPayment()}
          >
            {payState === "creating" ? "正在创建订单…" : payState === "pending" ? "等待支付…" : "继续购买"} <span aria-hidden="true">→</span>
          </button>
        ) : (
          <Link
            className="mf-primary-button"
            href="/login?next=%2Fhome%2Fupgrade&from=%2Fhome%2Fupgrade"
          >
            登录后购买 <span aria-hidden="true">→</span>
          </Link>
        )}
      </section>

      {checkout && payState !== "idle" ? (
        <section className="mf-upgrade-paypanel" aria-label="支付面板">
          {payState === "paid" ? (
            <div className="mf-upgrade-paypanel-paid">
              <span>✓</span>
              <div>
                <h2>支付成功，次数已到账</h2>
                <p>当前剩余报告额度 <strong>{balance ?? "—"}</strong> 次，可以直接生成合盘或个人解读。</p>
              </div>
            </div>
          ) : (
            <div className="mf-upgrade-paypanel-qr">
              <div className="mf-upgrade-paypanel-qrimg">
                {qrDataUrl ? <img src={qrDataUrl} alt="支付宝收款二维码" width={168} height={168} /> : <span>二维码生成中…</span>}
              </div>
              <div className="mf-upgrade-paypanel-copy">
                <h2>使用支付宝扫码支付</h2>
                <p>套餐：{selectedPackage.name} · {selectedPackage.usesLabel} · ¥{selectedPackage.price}</p>
                <p>支付完成后本页会自动刷新，次数实时到账。</p>
                <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer noopener">在浏览器中打开支付页面 →</a>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <p className="mf-upgrade-feedback" aria-live="polite">{message}</p>

      <section className="mf-upgrade-includes">
        <span>每个套餐均包含</span>
        <div>
          <p><i aria-hidden="true">✓</i> 明星合盘分析</p>
          <p><i aria-hidden="true">✓</i> 个人八字解读</p>
          <p><i aria-hidden="true">✓</i> 报告保存至个人账户</p>
        </div>
      </section>
    </div>
  );
}
