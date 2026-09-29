"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../auth-context";

type PurchaseMode = "one-time" | "membership";
type PackageId = "trial" | "explore" | "deep" | "monthly" | "annual";

type UpgradePackage = {
  id: PackageId;
  mode: PurchaseMode;
  name: string;
  price: number;
  priceSuffix?: string;
  uses: number;
  usesLabel: string;
  unitPrice: string;
  description: string;
  badge?: string;
};

const packages: readonly UpgradePackage[] = [
  {
    id: "trial",
    mode: "one-time",
    name: "体验版",
    price: 89,
    uses: 3,
    usesLabel: "3 次关系合盘",
    unitPrice: "29.67",
    description: "适合先体验几次关系合盘",
  },
  {
    id: "explore",
    mode: "one-time",
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
    mode: "one-time",
    name: "深度版",
    price: 599,
    uses: 50,
    usesLabel: "50 次关系合盘",
    unitPrice: "11.98",
    description: "适合高频使用与长期探索",
    badge: "单次最省",
  },
  {
    id: "monthly",
    mode: "membership",
    name: "月度会员",
    price: 59,
    priceSuffix: "/ 月",
    uses: 3,
    usesLabel: "每月发放 3 次",
    unitPrice: "19.67",
    description: "适合每月稳定探索，按月手动续费",
  },
  {
    id: "annual",
    mode: "membership",
    name: "年度会员",
    price: 499,
    priceSuffix: "/ 年",
    uses: 36,
    usesLabel: "全年 36 次 · 每月发放 3 次",
    unitPrice: "13.86",
    description: "适合长期使用，比连续购买月度会员节省 ¥209",
    badge: "年度推荐",
  },
] as const;

export default function UpgradeWorkspace() {
  const { status } = useAuth();
  const [mode, setMode] = useState<PurchaseMode>("one-time");
  const [selectedId, setSelectedId] = useState<PackageId>("explore");
  const [message, setMessage] = useState("");
  const visiblePackages = packages.filter((item) => item.mode === mode);
  const selectedPackage = packages.find((item) => item.id === selectedId) ?? packages[1];

  function changeMode(nextMode: PurchaseMode) {
    setMode(nextMode);
    setSelectedId(nextMode === "one-time" ? "explore" : "annual");
    setMessage("");
  }

  return (
    <div className="mf-upgrade-workspace">
      <header className="mf-upgrade-heading">
        <span className="mf-kicker">MYFATE MEMBERSHIP</span>
        <h1>选择你的关系探索方式</h1>
        <p>{mode === "one-time" ? "按需要购买关系合盘次数，购买后不会自动续费。" : "会员每月发放 3 次关系合盘，第一版采用手动续费，不会自动扣款。"}</p>
      </header>

      <div className="mf-upgrade-tabs" role="tablist" aria-label="购买方式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "one-time"}
          className={mode === "one-time" ? "is-active" : undefined}
          onClick={() => changeMode("one-time")}
        >
          按次购买
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "membership"}
          className={mode === "membership" ? "is-active" : undefined}
          onClick={() => changeMode("membership")}
        >
          会员购买
        </button>
      </div>

      <div className={mode === "membership" ? "mf-upgrade-plan-grid is-membership" : "mf-upgrade-plan-grid"} role="radiogroup" aria-label={mode === "one-time" ? "按次购买套餐" : "会员套餐"}>
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
              <span className="mf-upgrade-plan-price"><small>¥</small>{item.price}{item.priceSuffix ? <em>{item.priceSuffix}</em> : null}</span>
              <span className="mf-upgrade-plan-uses"><strong>{item.usesLabel}</strong></span>
              <span className="mf-upgrade-plan-unit">约 ¥{item.unitPrice} / 次</span>
              <span className="mf-upgrade-plan-description">{item.description}</span>
              <span className="mf-upgrade-plan-check" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      {mode === "membership" ? (
        <p className="mf-upgrade-membership-note">会员次数按月发放、当月有效；到期后可自行选择是否续费。</p>
      ) : null}

      <section className="mf-upgrade-checkout" aria-label="已选套餐">
        <div>
          <span>已选择</span>
          <strong>{selectedPackage.name} · {selectedPackage.usesLabel}</strong>
          <small>¥{selectedPackage.price}{selectedPackage.priceSuffix ? ` ${selectedPackage.priceSuffix}` : ""}，{selectedPackage.mode === "membership" ? "手动续费，不自动扣款" : "一次购买，不自动续费"}</small>
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
