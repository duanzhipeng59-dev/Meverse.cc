"use client";

import Link from "next/link";
import { useState } from "react";
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
    usesLabel: "3 次关系合盘",
    unitPrice: "29.67",
    description: "适合先体验几次关系合盘",
  },
  {
    id: "explore",
    mode: "package",
    name: "探索版",
    price: 239,
    uses: 10,
    usesLabel: "10 次关系合盘",
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
    usesLabel: "30 次关系合盘",
    unitPrice: "16.63",
    description: "适合高频使用与长期探索",
    badge: "单次最省",
  },
  {
    id: "single",
    mode: "single",
    name: "单次合盘",
    price: 50,
    uses: 1,
    usesLabel: "1 次关系合盘",
    unitPrice: "50.00",
    description: "适合只想体验一次完整关系合盘",
  },
] as const;

export default function UpgradeWorkspace() {
  const { status } = useAuth();
  const [mode, setMode] = useState<PurchaseMode>("package");
  const [selectedId, setSelectedId] = useState<PackageId>("explore");
  const [message, setMessage] = useState("");
  const visiblePackages = packages.filter((item) => item.mode === mode);
  const selectedPackage = packages.find((item) => item.id === selectedId) ?? packages[1];

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
        <p>{mode === "package" ? "购买多次关系合盘套餐，次数按需使用。" : "单次购买一份关系合盘，用完后可再次购买。"}</p>
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
            onClick={() => setMessage("套餐已选好，支付与次数到账功能将在下一步接入。")}
          >
            继续购买 <span aria-hidden="true">→</span>
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

      <p className="mf-upgrade-feedback" aria-live="polite">{message}</p>

      <section className="mf-upgrade-includes">
        <span>每个套餐均包含</span>
        <div>
          <p><i aria-hidden="true">✓</i> 三柱关系合盘</p>
          <p><i aria-hidden="true">✓</i> 完整关系结构分析</p>
          <p><i aria-hidden="true">✓</i> 报告保存至个人账户</p>
        </div>
      </section>
    </div>
  );
}
